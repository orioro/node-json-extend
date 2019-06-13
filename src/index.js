import toposort from 'toposort'
import merge from 'lodash.merge'
import traverse from 'traverse'
import omit from 'lodash.omit'
import objectPath from 'object-path'
import isPlainObject from 'lodash.isplainobject'
import { applyMatchingReduce } from '@orioro/util/fn'

const ROOT_NODE_ID = 'root'

const _pathAddRootPrefix = nodePath => {
  return `${ROOT_NODE_ID}.${nodePath}`
}

const _coreParserExtend = {
  criteria: node => node.extends instanceof NodeReference,
  fn: (node, parsedNodes) => {
    const targetNode = node.extends.resolve(parsedNodes)
    return {
      ...node,
      value: merge({}, targetNode.value, node.value)
    }
  }
}

const _coreParserDereferenceObjectProperties = {
  criteria: node => isPlainObject(node.value),
  fn: (node, parsedNodes) => {
    return {
      ...node,
      value: Object.keys(node.value).reduce((acc, property) => {
        const propertyValue = node.value[property]

        return {
          ...acc,
          [property]: propertyValue instanceof NodeReference ?
            propertyValue.resolve(parsedNodes).value : propertyValue
        }
      }, {})
    }
  }
}

const _coreParserDereferenceArrayItems = {
  criteria: node => Array.isArray(node.value),
  fn: (node, parsedNodes) => {
    return {
      ...node,
      value: node.value.map(value => {
        return value instanceof NodeReference ? value.resolve(parsedNodes).value : value
      })
    }
  }
}

const CORE_PARSERS = [
  _coreParserDereferenceObjectProperties,
  _coreParserDereferenceArrayItems,
  _coreParserExtend
]

/**
 * Executes parsers in order, passing the result of
 * the result of one parser as the parameter to the next.
 *
 * Also passes the fully parsed nodes to all the parsers
 *
 * @param  {Array}  parsers     Array of parser specifications
 * @param  {Object} node        The node to be parsed
 * @param  {Array}  parsedNodes Array of nodes that
 * @param  {Array}  allNodes    Array of all nodes (yet unparsed)
 * @return {Object}             The parsed node
 */
const _applyParsers = (parsers, node, parsedNodes, allNodes) => {
  return applyMatchingReduce(parsers, node, [parsedNodes, allNodes])
}

/**
 * Traverses the given object looking for items that
 * are schemas (have _type or _extend property defined).
 *
 * If the schema found is a property of some other object,
 * substitute it for a reference
 */
const _flatten = data => {
  return traverse(data).reduce(function (nodes, nodeValue) {
    const nodePath = this.isRoot ? ROOT_NODE_ID : _pathAddRootPrefix(this.path.join('.'))

    if (isPlainObject(nodeValue)) {
      return [...nodes, _createPlainObjectNode(nodePath, nodeValue)]
    } else if (Array.isArray(nodeValue)) {
      return [...nodes, _createArrayNode(nodePath, nodeValue)]
    } else {
      // Nodes that are not plain objects or arrays
      // are not considered as nodes for the processing pipeline
      return nodes
    }
  }, [])
}

class NodeReference {
  constructor(targetPath) {
    this.reference = true
    this.targetPath = targetPath
  }

  resolve(nodes) {
    return _getNode(nodes, this.targetPath)
  }
}

const _shouldBeReferenced = value => {
  return isPlainObject(value) || Array.isArray(value)
}

const _createPlainObjectNode = (nodePath, nodeValue) => {
  return {
    path: nodePath,
    value: Object.keys(nodeValue).reduce((acc, property) => {
      if (property === '_extends') {
        // `_extends` is a special property and will be ommited
        // from the final value
        return acc
      }

      const propertyValue = nodeValue[property]

      return {
        ...acc,
        [property]: _shouldBeReferenced(propertyValue) ?
          new NodeReference(`${nodePath}.${property}`) : propertyValue
      }
    }, {}),
    extends: nodeValue._extends ? new NodeReference(_pathAddRootPrefix(nodeValue._extends)) : null,
  }
}

const _createArrayNode = (nodePath, nodeValue) => {
  return {
    path: nodePath,
    value: nodeValue.map((item, index) => {
      return _shouldBeReferenced(item) ?
        new NodeReference(`${nodePath}.${index}`) : item
    })
  }
}

const _getNodeDependencies = (node, nodes) => {
  let dependencies = []

  if (isPlainObject(node.value)) {
    // Loop through properties and find instances of NodeReference
    dependencies = Object.keys(node.value).reduce((acc, property) => {
      const propertyValue = node.value[property]

      return propertyValue instanceof NodeReference ?
        [...acc, propertyValue.resolve(nodes)] : acc
    }, dependencies)

    // If the node extends another, add the extension target node
    // to its dependencies
    if (node.extends instanceof NodeReference) {
      dependencies = [...dependencies, node.extends.resolve(nodes)]
    }

  } else if (Array.isArray(node.value)) {
    // Loop through values and find instances of NodeReference
    dependencies = node.value.reduce((acc, value) => {
      return value instanceof NodeReference ?
        [...acc, value.resolve(nodes)] : acc
    }, dependencies)
  }

  return dependencies
}

/**
 * Sorts nodes by the dependency graph
 */
const _sortNodesByDependencyGraph = nodes => {
  const edges = nodes.reduce((acc, node) => {
    const dependencies = _getNodeDependencies(node, nodes)

    return [...acc, ...dependencies.map(dependency => [node, dependency])]
  }, [])

  return toposort(edges).reverse()
}

export const getNode = (nodes, nodePath) => {
  return nodes.find(node => node.path === nodePath)
}

const _getNode = (nodes, nodePath) => {
  const node = getNode(nodes, nodePath)

  if (!node) {
    throw new Error(`Could not retrieve node '${nodePath}'`)
  }

  return node
}

export const flatten = data => {
  const nodes = _sortNodesByDependencyGraph(_flatten(data))

  return nodes
}

export const resolveNodes = (nodes, options = {}) => {
  const parsers = Array.isArray(options.parsers) ?
    [...options.parsers, ...CORE_PARSERS] : CORE_PARSERS


  return nodes.reduce((parsed, node) => {
    // Incrementally pass parsed nodes to the parsers
    return [...parsed, _applyParsers(parsers, node, parsed, nodes)]
  }, [])
}

export const resolve = (data, options) => {
  const resolved = resolveNodes(flatten(data), options)
  return resolved[resolved.length - 1].value
}
