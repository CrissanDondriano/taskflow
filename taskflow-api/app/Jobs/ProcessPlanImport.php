<?php

namespace App\Jobs;

use App\Events\PlanImportStatusChanged;
use App\Models\PlanImport;
use App\Services\AiService;
use App\Services\AiUnavailableException;
use App\Services\EmptyDocumentException;
use App\Services\PlanTextExtractor;
use App\Services\TaskAssignmentService;
use App\Support\JobTitles;
use App\Support\PlanTaskValidator;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessPlanImport implements ShouldQueue
{
    use Queueable;

    /** Chars per AI call — keeps prompts small, cheap and inside limits. */
    public const CHUNK_SIZE = 8000;

    /** Hard cap so one giant upload can't fan out into dozens of AI calls. */
    public const MAX_CHUNKS = 5;

    public function __construct(public int $planImportId) {}

    public function handle(
        PlanTextExtractor $extractor,
        AiService $ai,
        TaskAssignmentService $assigner,
    ): void {
        $import = PlanImport::find($this->planImportId);

        // Never resurrect finished work: an approved import replays nothing,
        // a retry after a crash simply rebuilds the same result.
        if (! $import || $import->status === PlanImport::STATUS_APPROVED) {
            return;
        }

        $this->transition($import, PlanImport::STATUS_PROCESSING);

        try {
            $text = $extractor->extract(
                Storage::disk('local')->path($import->file_path),
                pathinfo($import->original_name, PATHINFO_EXTENSION)
            );
        } catch (EmptyDocumentException $e) {
            $this->failImport($import, $e->getMessage());

            return;
        }

        $import->update(['extracted_text' => mb_substr($text, 0, 200000)]);

        $knownRoles = $import->team->members()
            ->whereNotNull('users.job_title')
            ->distinct()
            ->pluck('users.job_title')
            ->values()
            ->all();
        if ($knownRoles === []) {
            $knownRoles = JobTitles::PRESETS;
        }

        try {
            $rows = [];
            foreach ($this->chunk($text) as $piece) {
                $payload = $this->extractChunk($ai, $piece, $knownRoles);
                foreach ($payload['tasks'] ?? [] as $row) {
                    $valid = PlanTaskValidator::validateRow($row);
                    if ($valid !== null) {
                        $rows[] = $valid;
                    }
                }
            }
        } catch (AiUnavailableException $e) {
            $this->failImport($import, $e->getMessage());

            return;
        }

        $rows = $this->dedupe($rows);

        if ($rows === []) {
            $this->failImport($import, 'The AI couldn\'t extract any tasks from that document. Try a plan with clearer action items, deliverables or milestones.');

            return;
        }

        $assigned = $assigner->assign($rows, $import->team()->with('members')->first());

        $import->update([
            'result_json' => ['tasks' => array_values($assigned)],
            'status' => PlanImport::STATUS_READY,
            'error_message' => null,
        ]);
        PlanImportStatusChanged::dispatch($import->fresh());
    }

    /**
     * One AI call with a single retry on undecodable output. Returns the
     * decoded payload ({tasks: [...]}) — may hold zero valid rows, which the
     * caller handles. Throws AiUnavailableException (no retry) when OpenAI
     * itself is unreachable.
     *
     * @param  array<int, string>  $knownRoles
     * @return array<string, mixed>
     */
    protected function extractChunk(AiService $ai, string $piece, array $knownRoles): array
    {
        $payload = $ai->extractPlanTasks($piece, $knownRoles);

        if ($payload === null) {
            Log::warning('ProcessPlanImport: undecodable AI output, retrying chunk once.');
            $payload = $ai->extractPlanTasks($piece, $knownRoles);
        }

        if (! is_array($payload) || ! isset($payload['tasks']) || ! is_array($payload['tasks'])) {
            Log::warning('ProcessPlanImport: chunk yielded no task list, skipping.');

            return ['tasks' => []];
        }

        return $payload;
    }

    /**
     * @return array<int, string>
     */
    protected function chunk(string $text): array
    {
        // Split on blank lines first so tasks aren't torn mid-sentence, then
        // pack paragraphs into size-capped chunks.
        $paragraphs = preg_split("/\n\s*\n/", $text) ?: [$text];
        $chunks = [];
        $current = '';
        foreach ($paragraphs as $para) {
            $para = trim($para);
            if ($para === '') {
                continue;
            }
            if ($current !== '' && mb_strlen($current) + mb_strlen($para) + 2 > self::CHUNK_SIZE) {
                $chunks[] = $current;
                $current = '';
                if (count($chunks) >= self::MAX_CHUNKS) {
                    break;
                }
            }
            $current .= ($current === '' ? '' : "\n\n").$para;
        }
        if ($current !== '' && count($chunks) < self::MAX_CHUNKS) {
            $chunks[] = $current;
        }

        return $chunks === [] ? [mb_substr($text, 0, self::CHUNK_SIZE)] : $chunks;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    protected function dedupe(array $rows): array
    {
        $seen = [];
        $out = [];
        foreach ($rows as $row) {
            $key = mb_strtolower(trim($row['title']));
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = $row;
        }

        return $out;
    }

    protected function transition(PlanImport $import, string $status): void
    {
        $import->update(['status' => $status, 'error_message' => null]);
        PlanImportStatusChanged::dispatch($import->fresh());
    }

    protected function failImport(PlanImport $import, string $message): void
    {
        Log::warning('ProcessPlanImport: import failed.', ['import_id' => $import->id, 'message' => $message]);
        $import->update(['status' => PlanImport::STATUS_FAILED, 'error_message' => $message]);
        PlanImportStatusChanged::dispatch($import->fresh());
    }

    /**
     * A crash mid-job (worker killed, timeout) retries once via the queue;
     * anything else this generic risks duplicating side effects for is
     * rebuilt idempotently above, so one retry is safe.
     */
    public function failed(\Throwable $exception): void
    {
        if ($import = PlanImport::find($this->planImportId)) {
            if ($import->status !== PlanImport::STATUS_APPROVED) {
                $this->failImport($import, 'Something went wrong while reading that plan. Please try again in a minute.');
            }
        }
    }
}
