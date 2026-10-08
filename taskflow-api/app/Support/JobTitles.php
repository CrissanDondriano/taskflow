<?php

namespace App\Support;

/**
 * Canonical workspace job titles. Members may also use a custom title
 * (validation on the write path is `nullable|string|max:100`, so anything
 * outside this list is accepted) — these presets are what the UI offers
 * first, and what Phase 2's auto-assign matching prefers.
 */
class JobTitles
{
    public const PRESETS = [
        'Designer',
        'Developer',
        'Accountant',
        'Project Manager',
        'Marketing',
        'QA',
        'Support',
    ];

    public static function isPreset(?string $title): bool
    {
        return $title !== null && in_array($title, self::PRESETS, true);
    }
}
