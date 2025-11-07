
import React, { useState, useEffect, useRef } from 'react';

interface EditableFieldProps {
  initialValue: string | number;
  onSave: (newValue: string) => void;
  isInteractive: boolean;
  type?: 'text' | 'number';
  className?: string;
  ariaLabel?: string;
  formatter?: (value: number) => string;
}

const EditableField: React.FC<EditableFieldProps> = ({
  initialValue,
  onSave,
  isInteractive,
  type = 'text',
  className = '',
  ariaLabel = 'Editable field',
  formatter,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(initialValue));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(String(initialValue));
  }, [initialValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    // Only save if the value has actually changed
    if (String(initialValue) !== value) {
        // For numbers, ensure we save a valid number, defaulting to 0
        if (type === 'number') {
            const numValue = parseFloat(value);
            onSave(isNaN(numValue) ? '0' : String(numValue));
        } else {
            onSave(value);
        }
    }
  };

  const handleCancel = () => {
    setValue(String(initialValue));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isInteractive) {
      e.stopPropagation(); // Prevent parent onClick handlers (like zoom)
      setIsEditing(true);
    }
  };
  
  if (!isInteractive) {
      return <span className={className}>{formatter ? formatter(Number(initialValue)) : initialValue}</span>;
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type === 'number' ? 'text' : 'text'}
        inputMode={type === 'number' ? 'decimal' : 'text'}
        pattern={type === 'number' ? '[0-9]*[.,]?[0-9]*' : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()} // Prevent parent onClick while editing
        className={`bg-background dark:bg-background-dark p-1 rounded-md border-b-2 border-primary dark:border-primary-dark focus:outline-none w-full min-w-0 ${className}`}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <span
      onClick={handleClick}
      className={`cursor-pointer rounded-md p-1 -m-1 hover:bg-primary/10 dark:hover:bg-primary-dark/10 transition-colors truncate ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsEditing(true)}
      aria-label={ariaLabel}
    >
      {formatter && type === 'number' ? formatter(Number(initialValue)) : initialValue}
    </span>
  );
};

export default EditableField;
