<?php

namespace App\Enums;

enum QuestionType: string
{
    case Text = 'text';
    case Textarea = 'textarea';
    case Number = 'number';
    case Date = 'date';
    case SingleChoice = 'single_choice';
    case MultipleChoice = 'multiple_choice';
    case Dropdown = 'dropdown';
    case Rating = 'rating';
    case Scale = 'scale';
    case YesNo = 'yes_no';
    case File = 'file';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Choice-based types that require at least one option.
     */
    public function requiresOptions(): bool
    {
        return in_array($this, [self::SingleChoice, self::MultipleChoice, self::Dropdown], true);
    }
}
