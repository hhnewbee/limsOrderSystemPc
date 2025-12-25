
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Select, InputNumber } from 'antd';
import { ICellEditorParams } from 'ag-grid-community';

// --- AntD Select Editor ---
export const AgAntdSelectEditor = forwardRef((props: ICellEditorParams, ref) => {
    const [value, setValue] = useState(props.value);
    const valueRef = useRef(props.value); // Value Ref
    const refInput = useRef<any>(null);

    useImperativeHandle(ref, () => ({
        getValue: () => valueRef.current, // Get from Ref
        isPopup: () => true,
    }));

    useEffect(() => {
        setTimeout(() => refInput.current?.focus(), 10);
    }, []);

    const handleChange = (val: any) => {
        setValue(val);
        valueRef.current = val; // Update Ref
        // Explicitly stop editing to ensure commit happens after selection
        // Use timeout to allow event propagation to finish
        setTimeout(() => props.stopEditing(), 0);
    };

    const options = props.colDef.cellEditorParams?.options || [];

    return (
        <Select
            ref={refInput}
            value={value}
            onChange={handleChange}
            style={{ width: '100%' }}
            defaultOpen
            options={options}
        />
    );
});

// --- AntD Number Editor ---
export const AgAntdNumberEditor = forwardRef((props: ICellEditorParams, ref) => {
    const [value, setValue] = useState(props.value);
    const valueRef = useRef(props.value); // Value Ref
    const refInput = useRef<any>(null);

    useImperativeHandle(ref, () => ({
        getValue: () => valueRef.current // Get from Ref
    }));

    useEffect(() => {
        setTimeout(() => refInput.current?.focus(), 10);
    }, []);

    const handleChange = (val: any) => {
        setValue(val);
        valueRef.current = val; // Update Ref
    };

    return (
        <InputNumber
            ref={refInput}
            value={value}
            onChange={handleChange}
            onPressEnter={() => props.stopEditing()}
            style={{ width: '100%' }}
            min={1}
        />
    );
});
