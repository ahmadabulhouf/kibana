/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiPopover,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSideNav,
  EuiCallOut,
  EuiFormRow,
  EuiFieldText,
  EuiLink,
  EuiButton,
} from '@elastic/eui';
import classNames from 'classnames';
import {
  IndexPatternColumn,
  OperationType,
  IndexPattern,
  IndexPatternField,
} from '../indexpattern';
import { IndexPatternDimensionPanelProps, OperationFieldSupportMatrix } from './dimension_panel';
import { operationDefinitionMap, getOperationDisplay, buildColumn } from '../operations';
import { deleteColumn, changeColumn } from '../state_helpers';
import { FieldSelect } from './field_select';
import { hasField } from '../utils';

const operationPanels = getOperationDisplay();

export function asOperationOptions(
  operationTypes: OperationType[],
  compatibleWithCurrentField: boolean
) {
  return [...operationTypes]
    .sort((opType1, opType2) => {
      return operationPanels[opType1].displayName.localeCompare(
        operationPanels[opType2].displayName
      );
    })
    .map(operationType => ({
      operationType,
      compatibleWithCurrentField,
    }));
}

export interface PopoverEditorProps extends IndexPatternDimensionPanelProps {
  selectedColumn?: IndexPatternColumn;
  operationFieldSupportMatrix: OperationFieldSupportMatrix;
  currentIndexPattern: IndexPattern;
}

export function PopoverEditor(props: PopoverEditorProps) {
  const {
    selectedColumn,
    operationFieldSupportMatrix,
    state,
    columnId,
    setState,
    layerId,
    currentIndexPattern,
  } = props;
  const { operationByDocument, operationByField, fieldByOperation } = operationFieldSupportMatrix;
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [
    incompatibleSelectedOperationType,
    setInvalidOperationType,
  ] = useState<OperationType | null>(null);

  const ParamEditor =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType].paramEditor;

  const fieldMap: Record<string, IndexPatternField> = useMemo(() => {
    const fields: Record<string, IndexPatternField> = {};
    currentIndexPattern.fields.forEach(field => {
      fields[field.name] = field;
    });

    return fields;
  }, [currentIndexPattern]);

  function getOperationTypes() {
    const possibleOperationTypes = Object.keys(fieldByOperation).concat(
      operationByDocument
    ) as OperationType[];

    const validOperationTypes: OperationType[] = [];
    if (!selectedColumn || !hasField(selectedColumn)) {
      validOperationTypes.push(...operationByDocument);
    }

    if (!selectedColumn) {
      validOperationTypes.push(...(Object.keys(fieldByOperation) as OperationType[]));
    } else if (hasField(selectedColumn) && operationByField[selectedColumn.sourceField]) {
      validOperationTypes.push(...operationByField[selectedColumn.sourceField]!);
    }

    return _.uniq(
      [
        ...asOperationOptions(validOperationTypes, true),
        ...asOperationOptions(possibleOperationTypes, false),
      ],
      'operationType'
    );
  }

  function getSideNavItems() {
    return [
      {
        name: '',
        id: '0',
        items: getOperationTypes().map(({ operationType, compatibleWithCurrentField }) => ({
          name: operationPanels[operationType].displayName,
          id: operationType as string,
          className: classNames('lnsConfigPanel__operation', {
            'lnsConfigPanel__operation--selected': Boolean(
              incompatibleSelectedOperationType === operationType ||
                (!incompatibleSelectedOperationType &&
                  selectedColumn &&
                  selectedColumn.operationType === operationType)
            ),
            'lnsConfigPanel__operation--incompatible': !compatibleWithCurrentField,
          }),
          'data-test-subj': `lns-indexPatternDimension${
            compatibleWithCurrentField ? '' : 'Incompatible'
          }-${operationType}`,
          onClick() {
            if (!selectedColumn) {
              const possibleFields = fieldByOperation[operationType] || [];
              const isFieldlessPossible = operationByDocument.includes(operationType);

              if (
                possibleFields.length === 1 ||
                (possibleFields.length === 0 && isFieldlessPossible)
              ) {
                setState(
                  changeColumn({
                    state,
                    layerId,
                    columnId,
                    newColumn: buildColumn({
                      columns: props.state.layers[props.layerId].columns,
                      suggestedPriority: props.suggestedPriority,
                      layerId: props.layerId,
                      op: operationType,
                      indexPattern: currentIndexPattern,
                      field: possibleFields.length === 1 ? fieldMap[possibleFields[0]] : undefined,
                      asDocumentOperation: possibleFields.length === 0,
                    }),
                  })
                );
              } else {
                setInvalidOperationType(operationType);
              }
              return;
            }
            if (!compatibleWithCurrentField) {
              setInvalidOperationType(operationType);
              return;
            }
            if (incompatibleSelectedOperationType) {
              setInvalidOperationType(null);
            }
            if (selectedColumn.operationType === operationType) {
              return;
            }
            const newColumn: IndexPatternColumn = buildColumn({
              columns: props.state.layers[props.layerId].columns,
              suggestedPriority: props.suggestedPriority,
              layerId: props.layerId,
              op: operationType,
              indexPattern: currentIndexPattern,
              field: hasField(selectedColumn) ? fieldMap[selectedColumn.sourceField] : undefined,
            });
            setState(
              changeColumn({
                state,
                layerId,
                columnId,
                newColumn,
              })
            );
          },
        })),
      },
    ];
  }

  return (
    <EuiPopover
      id={columnId}
      className="lnsConfigPanel__summaryPopover"
      anchorClassName="lnsConfigPanel__summaryPopoverAnchor"
      button={
        selectedColumn ? (
          <EuiLink
            className="lnsConfigPanel__summaryLink"
            onClick={() => {
              setPopoverOpen(!isPopoverOpen);
            }}
            data-test-subj="indexPattern-configure-dimension"
          >
            {selectedColumn.label}
          </EuiLink>
        ) : (
          <EuiButton
            className="lnsConfigPanel__summaryLink"
            data-test-subj="indexPattern-configure-dimension"
            onClick={() => setPopoverOpen(!isPopoverOpen)}
            iconType="plusInCircle"
            size="s"
          />
        )
      }
      isOpen={isPopoverOpen}
      closePopover={() => {
        setPopoverOpen(false);
        setInvalidOperationType(null);
      }}
      anchorPosition="leftUp"
      withTitle
      panelPaddingSize="s"
    >
      {isPopoverOpen && (
        <EuiFlexGroup gutterSize="s" direction="column">
          <EuiFlexItem>
            <FieldSelect
              fieldMap={fieldMap}
              currentIndexPattern={currentIndexPattern}
              operationFieldSupportMatrix={operationFieldSupportMatrix}
              selectedColumnOperationType={selectedColumn && selectedColumn.operationType}
              selectedColumnSourceField={
                selectedColumn && hasField(selectedColumn) ? selectedColumn.sourceField : undefined
              }
              incompatibleSelectedOperationType={incompatibleSelectedOperationType}
              onDeleteColumn={() => {
                setState(
                  deleteColumn({
                    state,
                    layerId,
                    columnId,
                  })
                );
              }}
              onChoose={choice => {
                const column = buildColumn({
                  columns: props.state.layers[props.layerId].columns,
                  field: 'field' in choice ? fieldMap[choice.field] : undefined,
                  indexPattern: currentIndexPattern,
                  layerId: props.layerId,
                  suggestedPriority: props.suggestedPriority,
                  op:
                    incompatibleSelectedOperationType ||
                    ('field' in choice ? choice.operationType : undefined),
                  asDocumentOperation: choice.type === 'document',
                });

                setState(
                  changeColumn({
                    state,
                    layerId,
                    columnId,
                    newColumn: column,
                  })
                );
                setInvalidOperationType(null);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={null} className={classNames('lnsConfigPanel__summaryPopoverLeft')}>
                <EuiSideNav items={getSideNavItems()} />
              </EuiFlexItem>
              <EuiFlexItem grow={true} className="lnsConfigPanel__summaryPopoverRight">
                {incompatibleSelectedOperationType && selectedColumn && (
                  <EuiCallOut
                    data-test-subj="indexPattern-invalid-operation"
                    title={i18n.translate('xpack.lens.indexPattern.invalidOperationLabel', {
                      defaultMessage: 'Operation not applicable to field',
                    })}
                    color="danger"
                    iconType="cross"
                  >
                    <p>
                      <FormattedMessage
                        id="xpack.lens.indexPattern.invalidOperationDescription"
                        defaultMessage="Please choose another field"
                      />
                    </p>
                  </EuiCallOut>
                )}
                {incompatibleSelectedOperationType && !selectedColumn && (
                  <EuiCallOut
                    size="s"
                    data-test-subj="indexPattern-fieldless-operation"
                    title={i18n.translate('xpack.lens.indexPattern.fieldlessOperationLabel', {
                      defaultMessage: 'Choose a field the operation is applied to',
                    })}
                    iconType="alert"
                  ></EuiCallOut>
                )}
                {!incompatibleSelectedOperationType && ParamEditor && (
                  <ParamEditor
                    state={state}
                    setState={setState}
                    columnId={columnId}
                    storage={props.storage}
                    dataPluginDependencies={props.dataPluginDependencies}
                    layerId={layerId}
                  />
                )}
                {!incompatibleSelectedOperationType && selectedColumn && (
                  <EuiFormRow label="Label">
                    <EuiFieldText
                      data-test-subj="indexPattern-label-edit"
                      value={selectedColumn.label}
                      onChange={e => {
                        setState(
                          changeColumn({
                            state,
                            layerId,
                            columnId,
                            newColumn: {
                              ...selectedColumn,
                              label: e.target.value,
                            },
                          })
                        );
                      }}
                    />
                  </EuiFormRow>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPopover>
  );
}