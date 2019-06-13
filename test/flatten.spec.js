import omit from 'lodash.omit'
import {
  flatten,
  resolve
} from '../src'

describe('flatten', () => {
  test('sorting order based on object nesting', () => {
    const DATA = {
      property_0: {
        property_00: 'STRING LITERAL',
        property_01: {
          property_010: 'property_010--value',
          property_011: 'property_011--value',
        },
        property_02: {
          property_020: 'property_020--value',
          property_021: 'property_021--value',
          property_022: {
            property_0221: 'property_0221--value',
          }
        },
      },
      property_3: 'STRING LITERAL',
      property_4: 10,
      property_5: true,
      property_6: undefined,
      property_7: null,
      property_8: new RegExp('^some-regexp'),
    }

    const nodes = flatten(DATA)
    expect(nodes.map(node => node.path)).toEqual([
      'root.property_0.property_02.property_022',
      'root.property_0.property_02',
      'root.property_0.property_01',
      'root.property_0',
      'root'
    ])
  })

  test('object', () => {
    const DATA = {
      property_0: 'property_0--value',
      property_1: 'property_1--value',
      property_2: {
        property_21: 'property_21--value',
      }
    }

    const nodes = flatten(DATA)
    expect(nodes.map(node => node.path)).toEqual([
      'root.property_2',
      'root'
    ])
  })

  test('root array', () => {
    const DATA = [
      10,
      {
        property_0: {
          property_00: 'obj_1.property_0.property_00--value',
        }
      },
      'STRING LITERAL',
    ]

    const nodes = flatten(DATA)
    expect(nodes).toHaveLength(3)
    expect(nodes.map(node => node.path)).toEqual([
      'root.1.property_0',
      'root.1',
      'root'
    ])
    expect(nodes[0].value).toEqual(DATA[1].property_0)
    expect(DATA[1]).toMatchObject(omit(nodes[1].value, ['property_0']))
    expect(DATA).toMatchObject([
      nodes[2].value[0], // literal
      {},                // reference
      nodes[2].value[2], // literal
    ])
  })

  test('nested array', () => {
    const DATA = {
      property_0: [
        {
          property_001: 'property_001--value',
          property_002: 'property_002--value',
        },
        {
          property_001: 'property_001--value',
          property_002: 'property_002--value',
        },
        [
          {
            property_010: 'property_010--value',
            property_011: 'property_011--value',
          },
          'STRING LITERAL',
          [
            'STRING LITERAL'
          ]
        ]
      ]
    }

    const nodes = flatten(DATA)
    expect(nodes.map(node => node.path)).toEqual([
      'root.property_0.2.2',
      'root.property_0.2.0',
      'root.property_0.2',
      'root.property_0.1',
      'root.property_0.0',
      'root.property_0',
      'root'
    ])
  })
})
