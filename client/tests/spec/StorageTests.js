describe("Storage functions", function() {
  var storage;

  beforeEach(function() {
    storage = new NoteStore();
    storage.storageName = "nsxData-tests";
  });

  it("should be able to retrieve selected note from notes", function() {
    expect(storage.note).toBeNull();

    var note = new Note("Hello", "123");
    var sel_note = new Note("Hello", "456");
    storage.addNote(note);
    storage.note = sel_note;
    expect(storage.note).not.toBeNull();
    expect(storage.note.key).toBe("456");
  });

  it("should correctly indicate whether or not it requires an update", function() {
    storage.version = 0;
    expect(storage.requiresUpdate()).toBe(true);

    storage.version = 999;
    expect(storage.requiresUpdate()).toBe(false);
  });
});
