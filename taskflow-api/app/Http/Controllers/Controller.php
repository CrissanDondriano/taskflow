<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

abstract class Controller
{
    use AuthorizesRequests;

    /**
     * Clamp an incoming ?per_page= value to a sane window (1–100) so
     * clients can pull larger pages without being able to ask the
     * database for everything at once.
     */
    protected function perPage(Request $request, int $default = 20): int
    {
        return min(max($request->integer('per_page', $default), 1), 100);
    }
}
