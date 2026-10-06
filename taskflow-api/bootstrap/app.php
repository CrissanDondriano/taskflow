<?php

use App\Http\Middleware\ForceHttps;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        apiPrefix: 'api/v1',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append([
            ForceHttps::class,
            SecurityHeaders::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $isApi = fn ($request) => $request->is('api/*') || $request->expectsJson();

        $exceptions->render(function (AuthenticationException $e, $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        });

        $exceptions->render(function (NotFoundHttpException $e, $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json(['message' => 'Resource not found.'], 404);
            }
        });

        $exceptions->render(function (AuthorizationException $e, $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json(['message' => $e->getMessage() ?: 'This action is unauthorized.'], 403);
            }
        });

        $exceptions->render(function (TooManyRequestsHttpException $e, $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json(['message' => 'Too many requests. Please try again later.'], 429);
            }
        });

        $exceptions->shouldRenderJsonWhen($isApi);
    })->create();
