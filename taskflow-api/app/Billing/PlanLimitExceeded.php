<?php

namespace App\Billing;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Thrown when a team hits a plan limit. Renders itself as HTTP 402 with a
 * machine-readable upgrade payload the SPA turns into an upgrade prompt.
 */
class PlanLimitExceeded extends RuntimeException
{
    public function __construct(
        public string $metric,
        public int $used,
        public int $limit,
        public string $plan,
    ) {
        $scope = in_array($metric, ['plan_imports', 'ai_messages'], true) ? ' per month' : '';
        parent::__construct(
            "Your {$plan} plan allows {$limit} ".str_replace('_', ' ', $metric)
            ."{$scope} and you've used {$used}. Upgrade to keep going."
        );
    }

    /**
     * @param  Request  $request
     * @return JsonResponse
     */
    public function render($request)
    {
        return response()->json([
            'message' => $this->getMessage(),
            'upgrade_required' => true,
            'metric' => $this->metric,
            'used' => $this->used,
            'limit' => $this->limit,
            'plan' => $this->plan,
        ], 402);
    }
}
