# Expansion State Preservation in Steps

## Overview

Steps preserves the expanded/collapsed state of outline nodes when saving and loading notes. This ensures that when you switch between notes or reload the app, your notes maintain the same visual hierarchy state you left them in.

## How It Works

### 1. Saving Expansion State

When a note is saved (`outlineToXml()` in `concord.js:3038-3068`):

1. The system walks through all nodes in the outline
2. For each node that is **expanded** AND **has children**, it records the node's ID
3. These IDs are saved as a comma-separated list in the `<expansionState>` tag in the OPML `<head>` section

**Example OPML with expansion state:**
```xml
<?xml version="1.0"?>
<opml version="2.0">
<head>
<title>My Note</title>
<expansionState>1,3,5</expansionState>
</head>
<body>
<outline text="Parent 1">  <!-- Node 1: expanded -->
  <outline text="Child 1.1"/>  <!-- Node 2 -->
</outline>
<outline text="Parent 2">  <!-- Node 3: expanded -->
  <outline text="Child 2.1"/>  <!-- Node 4 -->
</outline>
<outline text="Parent 3">  <!-- Node 5: expanded -->
  <outline text="Child 3.1"/>  <!-- Node 6 -->
</outline>
</body>
</opml>
```

### 2. Loading Expansion State

When a note is loaded (`xmlToOutline()` in `concord.js:3214-3249`):

1. All nodes are initially created with `collapsed=true` by default
2. The system reads the `<expansionState>` tag from the OPML
3. It walks through all nodes and **removes** the `collapsed` class from nodes whose IDs are in the expansion state list
4. Nodes NOT in the list remain collapsed

## Implementation Details

### Key Functions

**`outlineToXml()` (`concord.js:3038-3068`)**
```javascript
var expansionStates = [];
var nodeId = 1;
var cursor = root.find('.concord-node:first');
do {
    if (cursor) {
        // Record expanded nodes with children
        if (!cursor.hasClass('collapsed') &&
            cursor.children('ol').children().length > 0) {
            expansionStates.push(nodeId);
        }
        nodeId++;
    }
    // ... walk through all nodes
} while (cursor !== null);
head['expansionState'] = expansionStates.join(',');
```

**`xmlToOutline()` (`concord.js:3214-3249`)**
```javascript
var expansionState = doc.find('expansionState');
if (expansionState && expansionState.text() && expansionState.text() != '') {
    var expansionStates = expansionState.text().split(/\s*,\s*/);
    var nodeId = 1;
    var cursor = root.find('.concord-node:first');
    do {
        if (cursor) {
            // Expand nodes in the expansion state list
            if (expansionStates.indexOf('' + nodeId) >= 0) {
                cursor.removeClass('collapsed');
            }
            nodeId++;
        }
        // ... walk through all nodes
    } while (cursor !== null);
}
```

### Integration with Note Save/Load

**Saving a note (`notes.js:272-278`)**
```javascript
if (store.note) {
    store.note.value = ns.outlineToXml();  // Includes expansion state
    store.save();

    // Update search cache (only extracts text, doesn't affect expansion state)
    if (this.searchCacheManager) {
        this.searchCacheManager.updateNote(store.note);
    }
}
```

**Loading a note (`notes.js:640`)**
```javascript
this.outliner.op.xmlToOutline(note.value, false);  // Restores expansion state
```

## Common Issues and Solutions

### Issue: Expansion state not preserved

**Possible causes:**

1. **Cache interference**: If you're caching parsed OPML and reusing it, make sure the cache includes the full OPML with `<expansionState>` tag, not just text content.

2. **Incorrect save timing**: Ensure `outlineToXml()` is called AFTER users make changes to expansion state, not from a stale cached version.

3. **Missing expansion state tag**: Verify that saved OPML includes the `<expansionState>` tag in the `<head>` section.

**How to verify it's working:**

1. Open a note with hierarchical content
2. Expand some nodes and collapse others
3. Switch to a different note
4. Switch back to the original note
5. Verify that the expansion state is preserved

## Testing

Unit tests for expansion state preservation are in `/client/tests/spec/OutlinerFunctionTests.js`:

- `should preserve expanded/collapsed states when saving and loading notes`
- `should handle notes with all nodes collapsed`
- `should handle notes with all nodes expanded`

### Running Tests

```bash
# Open the test runner in your browser
open client/tests/SpecRunner.html
```

The tests verify:
- Expansion state is saved to OPML
- Expansion state contains correct node IDs
- Reloaded notes restore the correct expanded/collapsed state
- Edge cases (all collapsed, all expanded) work correctly

## Search Cache Integration

The search cache (`searchCache.js`) only extracts plain text for searching and does NOT interfere with expansion state:

- `extractTextFromNote()` parses OPML to get text only
- `updateNote()` is called AFTER `outlineToXml()` has already saved the full OPML with expansion state
- Search cache updates are independent of the outline save/load process

## Debugging

To debug expansion state issues:

1. **Check saved OPML:**
   ```javascript
   console.log(store.note.value);
   // Look for <expansionState>1,3,5</expansionState> in the head
   ```

2. **Check node states before save:**
   ```javascript
   concord.root.find('.concord-node').each(function() {
       console.log('Node ID:', nodeId++, 'Collapsed:', $(this).hasClass('collapsed'));
   });
   ```

3. **Check expansion state after load:**
   ```javascript
   var parser = new DOMParser();
   var xmlDoc = parser.parseFromString(store.note.value, 'text/xml');
   var expansionState = xmlDoc.querySelector('expansionState');
   console.log('Expansion state:', expansionState ? expansionState.textContent : 'NONE');
   ```

## Best Practices

1. **Always use `outlineToXml()` to save** - Never save raw text or partial OPML
2. **Always use `xmlToOutline()` to load** - Never manually build the outline from cached data
3. **Cache after save, not before** - Update caches AFTER calling `outlineToXml()`
4. **Preserve full OPML** - If caching, cache the complete OPML with all metadata

## References

- Concord outliner documentation: https://github.com/scripting/concord
- OPML 2.0 specification: http://opml.org/spec2.opml
- Node expansion state CSS: `client/css/concord.css:152` (`.concord-node.collapsed`)
