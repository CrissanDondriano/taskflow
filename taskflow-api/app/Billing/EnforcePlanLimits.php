<?php

namespace App\Billing;

use App\Models\Plan;
use App\Models\Team;
use App\Models\UsageCounter;

/**
 * Plan-limit checks and monthly usage accounting, per workspace (team).
 * Absolute caps (members, projects) count rows; rate metrics (plan_imports,
 * ai_messages) count this calendar month via usage_counters — a new month
 * is implicitly a fresh quota, so no reset job exists. A null limit means
 * unlimited. Over-limit writes throw PlanLimitExceeded (HTTP 402).
 */
class EnforcePlanLimits
{
    public function __construct(protected Team $team) {}

    public static function for(Team $team): self
    {
        return new self($team);
    }

    public function plan(): Plan
    {
        return $this->team->resolvePlan();
    }

    /** @return array{used: int, limit: ?int} */
    public function usage(string $metric): array
    {
        return ['used' => $this->count($metric), 'limit' => $this->plan()->limitFor($metric)];
    }

    /** @return array<string, array{used: int, limit: ?int}> */
    public function snapshot(): array
    {
        $out = [];
        foreach (config('billing.metrics', []) as $metric) {
            $out[$metric] = $this->usage($metric);
        }

        return $out;
    }

    /**
     * @throws PlanLimitExceeded
     */
    public function check(string $metric, int $additional = 1): void
    {
        $limit = $this->plan()->limitFor($metric);
        if ($limit === null) {
            return;
        }

        $used = $this->count($metric);
        if ($used + $additional > $limit) {
            throw new PlanLimitExceeded($metric, $used, $limit, $this->plan()->name);
        }
    }

    public function record(string $metric, int $count = 1): void
    {
        if (! in_array($metric, ['plan_imports', 'ai_messages'], true)) {
            return;
        }

        UsageCounter::query()->updateOrCreate(
            ['team_id' => $this->team->id, 'metric' => $metric, 'period' => UsageCounter::period()],
            ['count' => 0]
        )->increment('count', $count);
    }

    protected function count(string $metric): int
    {
        return match ($metric) {
            // Owner counts as a member even without a pivot row.
            'members' => $this->team->members()->count() + ($this->ownerInPivot() ? 0 : 1),
            'projects' => $this->team->projects()->count(),
            'plan_imports', 'ai_messages' => (int) UsageCounter::query()
                ->where('team_id', $this->team->id)
                ->where('metric', $metric)
                ->where('period', UsageCounter::period())
                ->value('count'),
            default => 0,
        };
    }

    protected function ownerInPivot(): bool
    {
        return $this->team->members()->where('users.id', $this->team->owner_id)->exists();
    }
}
