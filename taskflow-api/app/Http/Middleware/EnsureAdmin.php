<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    /**
     * Admin-only routes. Throwing AuthorizationException (rather than
     * abort(403)) reuses the JSON renderer registered in bootstrap/app.php,
     * so the response shape matches policy denials elsewhere in the API.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() || ! $request->user()->isAdmin()) {
            throw new AuthorizationException('Admin access required.');
        }

        return $next($request);
    }
}
