<?php

namespace App\Support;

/**
 * Normalizes one AI-extracted plan task row into the shape the review
 * screen and the approve endpoint understand. Returns null for rows that
 * aren't salvageable (missing/blank title) so the job can drop them.
 * The model's "urgent" maps to the schema's "critical" here, in one place.
 */
class PlanTaskValidator
{
    public const PRIORITIES = ['low', 'medium', 'high', 'critical'];

    /**
     * @return array<string, mixed>|null
     */
    public static function validateRow(mixed $row): ?array
    {
        if (! is_array($row)) {
            return null;
        }

        $title = trim((string) ($row['title'] ?? ''));
        if ($title === '') {
            return null;
        }

        $priority = mb_strtolower(trim((string) ($row['priority'] ?? 'medium')));
        if ($priority === 'urgent') {
            $priority = 'critical';
        }
        if (! in_array($priority, self::PRIORITIES, true)) {
            $priority = 'medium';
        }

        $dependsOn = $row['depends_on'] ?? [];
        if (! is_array($dependsOn)) {
            $dependsOn = [];
        }
        $dependsOn = array_values(array_filter(array_map(
            fn ($d) => is_string($d) ? trim($d) : '',
            $dependsOn
        )));

        $role = trim((string) ($row['required_role'] ?? ''));

        return [
            'title' => mb_substr($title, 0, 255),
            'description' => isset($row['description']) && is_string($row['description'])
                ? trim($row['description'])
                : '',
            'required_role' => $role === '' ? null : mb_substr($role, 0, 100),
            'priority' => $priority,
            'estimated_days' => max(0, (int) ($row['estimated_days'] ?? 0)),
            'depends_on' => $dependsOn,
            'suggested_due_offset_days' => max(0, (int) ($row['suggested_due_offset_days'] ?? 0)),
        ];
    }
}
