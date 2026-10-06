<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'status' => ['sometimes', 'in:backlog,todo,in_progress,review,testing,completed'],
            'priority' => ['sometimes', 'in:low,medium,high,critical'],
            'category' => ['nullable', 'string', 'max:100'],
            'due_date' => ['nullable', 'date'],
        ];
    }
}
