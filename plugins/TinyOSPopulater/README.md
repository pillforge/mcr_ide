### Grammar [ref: nesC 1.3 Language Reference Manual]

```
nesC-file:
  [translation-unit] interface-definition
  [translation-unit] component
interface-definition:~
  interface identifier [type-parameters] [attributes] { declaration-list }
```
~: Not fully implemented yet.

### Meta Description

All objects have type and name inherently.

```
nesC-file
  @translation-unit: string
  >interface-definition
    0..* declaration
    Notes
      interface: type of the object
      identifier: name of the object
      { declaration-list }: 0..* declaration
  >component
    >configuration
    >module
declaration
  @async: boolean
  @return-type: string
  >event
  >command
```

Notes: 'object' refers a WebGME object or node.

- folder
- configuration
  - attributes
    - name: string
    - translation-unit: string
- module
  - attributes
    - name: string
    - translation-unit: string
- uses-provides
  - attributes
    - name: string
    - type-arguments: string
  - pointers
    - interface: interface-definition
