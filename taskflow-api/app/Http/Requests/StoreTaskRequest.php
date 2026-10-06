<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'project_id' => ['required', 'exists:projects,id'],
            'parent_task_id' => ['nullable', 'exists:tasks,id'],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:backlog,todo,in_progress,review,testing,completed'],
            'priority' => ['sometimes', 'in:low,medium,high,critical'],
            'category' => ['nullable', 'string', 'max:100'],
            'due_date' => ['nullable', 'date'],
            'is_recurring' => ['sometimes', 'boolean'],
            'recurrence_rule' => ['nullable', 'array'],
        ];
    }
}
