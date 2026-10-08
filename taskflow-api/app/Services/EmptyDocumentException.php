<?php

namespace App\Services;

use RuntimeException;

/** The uploaded plan yielded no usable text (scanned PDF, blank file…). */
class EmptyDocumentException extends RuntimeException {}
