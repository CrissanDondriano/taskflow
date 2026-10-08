<?php

namespace App\Services;

use PhpOffice\PhpWord\Element\ListItem;
use PhpOffice\PhpWord\Element\Table;
use PhpOffice\PhpWord\Element\Text;
use PhpOffice\PhpWord\Element\TextRun;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use Smalot\PdfParser\Parser as PdfParser;

/**
 * Pulls plain text out of an uploaded plan document. TXT/MD are read
 * directly; PDF goes through smalot/pdfparser; DOCX through PhpWord (body
 * paragraphs, runs, tables and list items — headers/footers skipped).
 * Scanned/empty documents raise EmptyDocumentException with a message the
 * UI shows verbatim (OCR is out of scope).
 */
class PlanTextExtractor
{
    public function extract(string $absolutePath, string $extension): string
    {
        $text = match (strtolower($extension)) {
            'pdf' => $this->fromPdf($absolutePath),
            'docx' => $this->fromDocx($absolutePath),
            'txt', 'md' => $this->fromText($absolutePath),
            default => throw new \InvalidArgumentException("Unsupported plan format: {$extension}."),
        };

        $text = trim(preg_replace('/[ \t\x0B\f\x{A0}]+/u', ' ', $text ?? ''));
        $text = trim(preg_replace("/\n{3,}/", "\n\n", $text));

        if ($text === '') {
            throw new EmptyDocumentException(
                'We couldn\'t find any text in that file. If it\'s a scanned PDF or an image-only export, save it as a text-based PDF, DOCX, TXT or Markdown file and try again — automatic OCR isn\'t supported.'
            );
        }

        return $text;
    }

    protected function fromPdf(string $path): string
    {
        try {
            $pdf = (new PdfParser)->parseFile($path);
        } catch (\Throwable $e) {
            throw new EmptyDocumentException('That PDF couldn\'t be read — it may be corrupt or password-protected. Try exporting it again as a text-based PDF.');
        }

        return (string) $pdf->getText();
    }

    protected function fromDocx(string $path): string
    {
        try {
            $doc = WordIOFactory::load($path, 'Word2007');
        } catch (\Throwable $e) {
            throw new EmptyDocumentException('That Word file couldn\'t be read — it may be corrupt. Try saving it again as DOCX.');
        }

        $blocks = [];
        foreach ($doc->getSections() as $section) {
            foreach ($section->getElements() as $element) {
                $line = $this->elementText($element);
                if ($line !== '') {
                    $blocks[] = $line;
                }
            }
        }

        return implode("\n", $blocks);
    }

    protected function elementText(mixed $element): string
    {
        if ($element instanceof Text) {
            return (string) $element->getText();
        }

        if ($element instanceof TextRun) {
            $parts = [];
            foreach ($element->getElements() as $child) {
                if ($child instanceof Text) {
                    $parts[] = (string) $child->getText();
                }
            }

            return implode('', $parts);
        }

        // List items stringify to their text via __toString on most builds;
        // fall back to getText() where the method exists.
        if ($element instanceof ListItem) {
            return method_exists($element, 'getText') ? (string) $element->getText() : '';
        }

        if ($element instanceof Table) {
            $cells = [];
            foreach ($element->getRows() as $row) {
                foreach ($row->getCells() as $cell) {
                    foreach ($cell->getElements() as $child) {
                        $line = $this->elementText($child);
                        if ($line !== '') {
                            $cells[] = $line;
                        }
                    }
                }
            }

            return implode(' | ', $cells);
        }

        return '';
    }

    protected function fromText(string $path): string
    {
        $contents = @file_get_contents($path);

        if ($contents === false) {
            throw new EmptyDocumentException('That file couldn\'t be read. Try uploading it again.');
        }

        // Strip a UTF-8 BOM so it never leaks into the first task title.
        return ltrim($contents, "\xEF\xBB\xBF");
    }
}
