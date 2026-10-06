<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:active,completed,archived'],
            'priority' => ['sometimes', 'in:low,medium,high,critical'],
            'start_date' => ['nullable', 'date'],
            'deadline' => ['nullable', 'date'],
        ];
    }
}
