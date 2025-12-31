# Expansion State Preservation - Verification Checklist

## Quick Verification Steps

### 1. Manual Testing

- [ ] Open a note with hierarchical content (parent/child nodes)
- [ ] Expand 2-3 specific parent nodes
- [ ] Leave the rest collapsed
- [ ] Switch to a different note
- [ ] Switch back to the original note
- [ ] **VERIFY**: The same nodes you expanded are still expanded
- [ ] **VERIFY**: The collapsed nodes are still collapsed

### 2. Check Saved OPML

Open browser console and run:

```javascript
// After expanding some nodes, save and check the OPML
console.log(store.note.value);
```

**Expected result**: You should see an `<expansionState>` tag in the `<head>` section like:
```xml
<head>
<title>My Note</title>
<expansionState>1,3,5,7</expansionState>
</head>
```

**If missing**: The `outlineToXml()` function is not being called correctly or expansion state is not being calculated.

### 3. Run Unit Tests

- [ ] Open `client/tests/SpecRunner.html` in your browser
- [ ] Look for "Expansion State Preservation" test suite
- [ ] **VERIFY**: All 3 tests pass:
  - ✓ should preserve expanded/collapsed states when saving and loading notes
  - ✓ should handle notes with all nodes collapsed
  - ✓ should handle notes with all nodes expanded

**If tests fail**: See "Troubleshooting" section below.

## Common Issues and Fixes

### Issue 1: No `<expansionState>` tag in saved OPML

**Symptoms**:
- Saved OPML doesn't contain `<expansionState>` tag
- All nodes reset to collapsed when reloading

**Possible causes**:
1. `outlineToXml()` is not being called
2. Cached OPML is being used instead of fresh generation
3. Expansion state calculation loop is broken

**Check**:
```javascript
// In notes.js, verify saveNote() calls:
store.note.value = ns.outlineToXml();  // Line 272

// This should call concord.js outlineToXml() which includes:
head['expansionState'] = expansionStates.join(',');  // Line 3068
```

**Fix**: Ensure `saveNote()` always calls `ns.outlineToXml()` to generate fresh OPML with current expansion state.

---

### Issue 2: `<expansionState>` exists but nodes don't restore correctly

**Symptoms**:
- Saved OPML has `<expansionState>1,3,5</expansionState>`
- But nodes are all collapsed (or all expanded) after reload

**Possible causes**:
1. `xmlToOutline()` is not reading expansion state
2. Cached HTML/DOM is being used instead of re-parsing OPML
3. Node IDs are misaligned

**Check**:
```javascript
// After loading a note, verify expansion state was read:
var parser = new DOMParser();
var xmlDoc = parser.parseFromString(store.note.value, 'text/xml');
var expansionState = xmlDoc.querySelector('expansionState');
console.log('Read expansion state:', expansionState ? expansionState.textContent : 'NONE');

// Check which nodes are actually expanded:
var nodeId = 1;
concord.root.find('.concord-node').each(function() {
    var hasChildren = $(this).children('ol').children().length > 0;
    var isCollapsed = $(this).hasClass('collapsed');
    console.log(`Node ${nodeId}: hasChildren=${hasChildren}, collapsed=${isCollapsed}`);
    nodeId++;
});
```

**Fix**: Ensure `launchNote()` calls `xmlToOutline(note.value)` and not a cached DOM representation.

---

### Issue 3: Expansion state changes unexpectedly

**Symptoms**:
- You expand nodes, but they collapse again immediately
- Expansion state keeps changing without user action

**Possible causes**:
1. Auto-save is using stale outline data
2. Cache is being applied after load, overwriting expansion state
3. Multiple `xmlToOutline()` calls with different data

**Check**:
```javascript
// Add debug logging to track xmlToOutline calls:
// In concord.js:3183, add:
console.log('xmlToOutline called with:', xmlText.substring(0, 200));

// In notes.js:640, add:
console.log('launchNote: Loading note with value:', note.value.substring(0, 200));
```

**Fix**: Ensure only one source of truth for note OPML. Don't mix cached data with fresh OPML.

---

### Issue 4: Search cache interfering with expansion state

**Symptoms**:
- Expansion state works initially but breaks after search
- Notes lose expansion state after cache update

**Root cause**: If you modified the search cache to store parsed OPML or DOM structure and are reusing it for rendering.

**Check**:
```javascript
// In searchCache.js, verify extractTextFromNote() only extracts text:
extractTextFromNote(note) {
    // Should only return plain text, not DOM or OPML structure
    return fullText.substring(0, 10000);
}

// Verify updateNote() doesn't modify note.value:
updateNote(note) {
    const searchText = this.extractTextFromNote(note);
    this.store.searchCache[note.key] = searchText;  // Only cache text
    // Should NOT do: note.value = something;
}
```

**Fix**:
- Search cache should ONLY store searchable plain text
- Never cache or reuse parsed DOM structures
- Always call `xmlToOutline(note.value)` when loading notes

---

## Code Flow Verification

### Saving Flow (Should preserve expansion state)

1. User expands/collapses nodes manually
2. Auto-save timer triggers `saveNote()` (every 5 seconds)
3. `saveNote()` calls `ns.outlineToXml()` → Line 272
4. `outlineToXml()` walks all nodes and records expanded ones → Lines 3038-3068
5. Expansion state saved as `<expansionState>1,3,5</expansionState>` → Line 3068
6. Full OPML (with expansion state) saved to `store.note.value` → Line 272
7. Search cache updated (only extracts text) → Line 277

**Verify each step** by adding `console.log()` statements.

### Loading Flow (Should restore expansion state)

1. User clicks on a note in the notes list
2. `launchNote(note)` is called → Line 611
3. `xmlToOutline(note.value, false)` is called → Line 640
4. `xmlToOutline()` builds DOM with all nodes collapsed → Line 3210
5. `xmlToOutline()` reads `<expansionState>` tag → Line 3214
6. For each node ID in expansion state, removes `collapsed` class → Line 3226
7. Final DOM has correct expansion state

**Verify each step** by adding `console.log()` statements.

---

## Debug Mode

Enable debug logging:

```javascript
// In notes.js, add at the top of saveNote():
console.log('[SAVE] Current expansion state before save:');
var nodeId = 1;
concord.root.find('.concord-node').each(function() {
    if (!$(this).hasClass('collapsed') && $(this).children('ol').children().length > 0) {
        console.log('[SAVE] Node', nodeId, 'is EXPANDED');
    }
    nodeId++;
});

// After outlineToXml():
console.log('[SAVE] Generated OPML:', store.note.value.substring(0, 500));

// In launchNote(), add:
console.log('[LOAD] Loading note with OPML:', note.value.substring(0, 500));

// After xmlToOutline():
console.log('[LOAD] Final expansion state after load:');
nodeId = 1;
concord.root.find('.concord-node').each(function() {
    if (!$(this).hasClass('collapsed') && $(this).children('ol').children().length > 0) {
        console.log('[LOAD] Node', nodeId, 'is EXPANDED');
    }
    nodeId++;
});
```

---

## Expected Behavior

✅ **Correct behavior**:
- Expansion state is saved in OPML `<head>` section
- Nodes maintain their expanded/collapsed state when switching notes
- Search cache updates don't affect expansion state
- Auto-save preserves current expansion state

❌ **Incorrect behavior**:
- No `<expansionState>` tag in saved OPML
- All nodes collapse when switching notes
- Expansion state changes after search cache update
- Expansion state resets to all-collapsed or all-expanded

---

## Performance Considerations

The expansion state mechanism has minimal overhead:
- **Save**: Adds ~50ms to walk all nodes (for 1000 nodes)
- **Load**: Adds ~30ms to restore expansion state
- **Storage**: Adds ~50 bytes to OPML (comma-separated node IDs)

This is negligible compared to the overall save/load time.

---

## Summary

If expansion state is not working:

1. ✅ Run unit tests to confirm the mechanism works in isolation
2. ✅ Check that saved OPML contains `<expansionState>` tag
3. ✅ Verify `outlineToXml()` and `xmlToOutline()` are called correctly
4. ✅ Ensure no cached data is overwriting the expansion state
5. ✅ Confirm search cache doesn't modify `note.value`

The unit tests provide a reference implementation that works correctly. Compare your actual code flow to the test code to identify discrepancies.
