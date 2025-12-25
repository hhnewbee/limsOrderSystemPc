'use client';

import React from 'react';
import { Input, Select, InputNumber, Radio } from 'antd';
import { CSSProperties } from 'react';

interface ReadOnlyTextProps {
    value: React.ReactNode;
    style?: CSSProperties;
}

interface CommonEditableProps {
    value?: any;
    onChange?: (val: any) => void;
    disabled?: boolean;
    readOnly?: boolean;
    placeholder?: string;
    [key: string]: any; // Allow loose props
}

type EditableInputProps = CommonEditableProps;
type EditableInputNumberProps = CommonEditableProps & { min?: number };
type EditableSelectProps = CommonEditableProps & { options?: any[]; mode?: any };
type EditableRadioProps = CommonEditableProps & { options?: any[] };
type EditableTextAreaProps = CommonEditableProps & { rows?: number };


// 只读文本显示组件
export function ReadOnlyText({ value, style = {} }: ReadOnlyTextProps) {
    return (
        <div
            style={{
                fontSize: 14,
                color: '#262626',
                lineHeight: 1.5,
                wordBreak: 'break-word',
                padding: '8px 0',
                ...style
            }}
        >
            {value || '-'}
        </div>
    );
}

// 可编辑/只读的输入框
export function EditableInput({
    value,
    onChange,
    disabled,
    readOnly = false,
    size = "middle",
    placeholder = "",
    ...props
}: EditableInputProps) {
    if (readOnly || disabled) {
        return <ReadOnlyText value={value} />;
    }

    return (
        <Input
            value={value}
            onChange={onChange}
            disabled={disabled}
            size={size}
            placeholder={placeholder}
            {...props}
        />
    );
}

// 可编辑/只读的数字输入
export function EditableInputNumber({
    value,
    onChange,
    disabled,
    readOnly = false,
    min = 0,
    ...props
}: EditableInputNumberProps) {
    if (readOnly || disabled) {
        return <ReadOnlyText value={value} />;
    }

    return (
        <InputNumber
            value={value}
            onChange={onChange}
            disabled={disabled}
            min={min}
            {...props}
        />
    );
}

// 可编辑/只读的选择框
export function EditableSelect({
    value,
    onChange,
    disabled,
    readOnly = false,
    options = [],
    mode = undefined,
    placeholder = "",
    ...props
}: EditableSelectProps) {
    if (readOnly || disabled) {
        if (mode === 'multiple' && Array.isArray(value)) {
            return <ReadOnlyText value={value.join(', ')} />;
        }
        // 查找对应选项的标签
        const option = options.find(opt => opt.value === value);
        return <ReadOnlyText value={option?.label || value} />;
    }

    return (
        <Select
            value={value}
            onChange={onChange}
            disabled={disabled}
            options={options}
            mode={mode}
            placeholder={placeholder}
            style={{ width: '100%' }}
            {...props}
        />
    );
}

// 可编辑/只读的单选框
export function EditableRadio({
    value,
    onChange,
    disabled,
    readOnly = false,
    options = [],
    ...props
}: EditableRadioProps) {
    if (readOnly || disabled) {
        // 查找对应选项的标签
        const option = options.find(opt => opt.value === value);
        return <ReadOnlyText value={option?.label || value} />;
    }

    return (
        <Radio.Group
            value={value}
            onChange={onChange}
            disabled={disabled}
            {...props}
        >
            {options.map(opt => (
                <Radio key={opt.value} value={opt.value}>
                    {opt.label}
                </Radio>
            ))}
        </Radio.Group>
    );
}

// 可编辑/只读的文本域
export function EditableTextArea({
    value,
    onChange,
    disabled,
    readOnly = false,
    rows = 3,
    placeholder = "",
    ...props
}: EditableTextAreaProps) {
    if (readOnly || disabled) {
        return <ReadOnlyText value={value} style={{ whiteSpace: 'pre-wrap' }} />;
    }

    return (
        <Input.TextArea
            value={value}
            onChange={onChange}
            disabled={disabled}
            rows={rows}
            placeholder={placeholder}
            {...props}
        />
    );
}
