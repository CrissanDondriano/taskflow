<?php

namespace Database\Factories;

use App\Models\PlanImport;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PlanImport>
 */
class PlanImportFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'project_id' => null,
            'user_id' => User::factory(),
            'file_path' => 'plan-imports/'.fake()->uuid().'.txt',
            'original_name' => 'plan.txt',
            'status' => PlanImport::STATUS_PENDING,
            'extracted_text' => null,
            'result_json' => null,
            'error_message' => null,
        ];
    }
}
