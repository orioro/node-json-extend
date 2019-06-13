import omit from 'lodash.omit'

import {
  resolve
} from '../src'

describe('resolve', () => {
  test('object', () => {
    const DATA = {
      item_1: {
        id: 'item_1',
        property_1: 'item_1--value_1',
        property_2: {
          id: 'item_1.property_2',
          _extends: 'item_2',
          property_21: 'item_1--value_21',
          property_22: {
            id: 'item_1.property_2.property_22',
            property_221: 'item_1--value_221',
            _extends: 'item_2',
          }
        },
        property_3: 'item_1--value_3'
      },
      item_2: {
        id: 'item_2',
        property_3: 'item_2--value_3',
        property_4: 'item_2--value_4',
      }
    }

    const resolved = resolve(DATA)

    expect(resolved.item_2).toEqual(DATA.item_2)
    expect(omit(resolved.item_1, ['property_2'])).toEqual(omit(DATA.item_1, ['property_2']))
    expect(resolved.item_1.property_2.property_22).toEqual(omit({
      ...DATA.item_2,
      ...DATA.item_1.property_2.property_22,
    }, ['_extends']))
    expect(resolved.item_1.property_2).toEqual(omit({
      ...DATA.item_2,
      ...DATA.item_1.property_2,
      property_22: omit({
        ...DATA.item_2,
        ...DATA.item_1.property_2.property_22,
      }, ['_extends'])
    }, ['_extends']))
  })

  test('array', () => {
    const DATA = [
      {
        id: 'test-object-1',
        name: 'Test object 1',
        config: {
          boolean: true,
          number: 2,
        }
      },
      {
        property_1: {
          _extends: '0.config',
          boolean: false,
        }
      }
    ]

    const resolved = resolve(DATA)
    expect(resolved[1].property_1).toEqual({
      ...DATA[0].config,
      boolean: false
    })
  })

  test('nested array', () => {
    const DATA = {
      schema_1: {
        type: 'data-model',
        attachments: {
          type: 'list',
          of: [
            null,
            {
              _extends: 'file_schema',
              type: 'document',
              properties: {
                attachmentComments: 'string'
              }
            },
            {
              _extends: 'file_schema',
              type: 'image',
              properties: {
                width: 'number',
                height: 'number',
              }
            }
          ]
        }
      },
      file_schema: {
        type: 'file',
        properties: {
          mimeType: 'string',
          url: 'string',
          size: 'number',
        }
      }
    }

    const resolved = resolve(DATA)
    expect(resolved.schema_1.attachments.of[0]).toEqual(null)
    expect(resolved.schema_1.attachments.of[1]).toEqual(omit({
      ...DATA.file_schema,
      ...DATA.schema_1.attachments.of[1],
      properties: {
        ...DATA.file_schema.properties,
        ...DATA.schema_1.attachments.of[1].properties,
      }
    }, ['_extends']))

    expect(resolved.schema_1.attachments.of[2]).toEqual(omit({
      ...DATA.file_schema,
      ...DATA.schema_1.attachments.of[2],
      properties: {
        ...DATA.file_schema.properties,
        ...DATA.schema_1.attachments.of[2].properties,
      }
    }, ['_extends']))
  })

  test('custom parser', () => {
    const DATA = {
      schema_1: {
        type: 'data-model',
        attachments: {
          type: 'list',
          of: [
            null,
            {
              _extends: 'file_schema',
              type: 'document',
              properties: {
                attachmentComments: 'string'
              }
            },
            {
              _extends: 'file_schema',
              type: 'image',
              properties: {
                width: 'number',
                height: 'number',
              }
            }
          ]
        }
      },
      file_schema: {
        type: 'file',
        properties: {
          mimeType: 'string',
          url: 'string',
          size: 'number',
        }
      }
    }

    const FILE_VALIDATIONS = [
      {
        maxSize: 10000,
      }
    ]

    const typeFileParser = {
      criteria: {
        'value.type': 'file',
      },
      fn: node => {
        return {
          ...node,
          value: {
            ...node.value,
            validations: FILE_VALIDATIONS
          }
        }
      }
    }

    const resolved = resolve(DATA, {
      parsers: [typeFileParser]
    })

    expect(resolved.file_schema).toEqual({
      ...DATA.file_schema,
      validations: FILE_VALIDATIONS,
    })
    expect(resolved.schema_1.attachments.of[0]).toEqual(null)
    expect(resolved.schema_1.attachments.of[1]).toEqual(omit({
      ...DATA.file_schema,
      ...DATA.schema_1.attachments.of[1],
      properties: {
        ...DATA.file_schema.properties,
        ...DATA.schema_1.attachments.of[1].properties,
      },
      validations: FILE_VALIDATIONS,
    }, ['_extends']))

    expect(resolved.schema_1.attachments.of[2]).toEqual(omit({
      ...DATA.file_schema,
      ...DATA.schema_1.attachments.of[2],
      properties: {
        ...DATA.file_schema.properties,
        ...DATA.schema_1.attachments.of[2].properties,
      },
      validations: FILE_VALIDATIONS,
    }, ['_extends']))
  })
})
