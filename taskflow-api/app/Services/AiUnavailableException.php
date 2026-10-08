<?php

namespace App\Services;

use RuntimeException;

/** OpenAI is unreachable or unconfigured — fail the import, don't retry. */
class AiUnavailableException extends RuntimeException {}
