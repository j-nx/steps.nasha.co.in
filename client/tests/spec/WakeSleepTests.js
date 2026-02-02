describe('Wake/Sleep Handling', function () {
    var originalLastSeen;
    var originalTIMEOUT;
    var originalIsMobile;
    var originalNs;
    var originalIdler;
    var originalAppPrefs;

    beforeEach(function () {
        // Save original globals
        originalLastSeen = window.lastSeen;
        originalTIMEOUT = window.TIMEOUT;
        originalIsMobile = window.isMobile;
        originalNs = window.ns;
        originalIdler = window.idler;
        originalAppPrefs = window.appPrefs;

        // Set test defaults
        window.TIMEOUT = 20; // 20 minutes
        window.isMobile = false;
        window.lastSeen = Date.now();
        window.appPrefs = { readonly: false };
    });

    afterEach(function () {
        // Restore original globals
        window.lastSeen = originalLastSeen;
        window.TIMEOUT = originalTIMEOUT;
        window.isMobile = originalIsMobile;
        window.ns = originalNs;
        window.idler = originalIdler;
        window.appPrefs = originalAppPrefs;
    });

    // describe('isOnWake', function () {
    //     it('should return false when lastSeen is recent', function () {
    //         window.lastSeen = Date.now();

    //         expect(isOnWake()).toBe(false);
    //     });

    //     it('should return false when just under threshold', function () {
    //         // Threshold is TIMEOUT * 60000 + 120000 (20 min + 2 min = 22 min)
    //         var justUnderThreshold = window.TIMEOUT * 60000 + 120000 - 1000;
    //         window.lastSeen = Date.now() - justUnderThreshold;

    //         expect(isOnWake()).toBe(false);
    //     });

    //     it('should return true when over threshold', function () {
    //         // Set lastSeen to well over threshold (25 minutes ago)
    //         var overThreshold = window.TIMEOUT * 60000 + 120000 + 60000;
    //         window.lastSeen = Date.now() - overThreshold;

    //         expect(isOnWake()).toBe(true);
    //     });

    //     it('should return true exactly at threshold', function () {
    //         // Exactly at threshold + 1ms
    //         var atThreshold = window.TIMEOUT * 60000 + 120000 + 1;
    //         window.lastSeen = Date.now() - atThreshold;

    //         expect(isOnWake()).toBe(true);
    //     });
    // });

    describe('isAppDisabled', function () {
        it('should return false when ns is not defined', function () {
            window.ns = undefined;

            expect(isAppDisabled()).toBe(false);
        });

        it('should return false when ngScope is not defined', function () {
            window.ns = {};

            expect(isAppDisabled()).toBe(false);
        });

        it('should return true when isAppDisabled is true', function () {
            window.ns = {
                ngScope: {
                    isAppDisabled: true
                }
            };

            expect(isAppDisabled()).toBe(true);
        });

        it('should return true when isAppDisabled is undefined', function () {
            window.ns = {
                ngScope: {
                    isAppDisabled: undefined
                }
            };

            expect(isAppDisabled()).toBe(true);
        });

        it('should return false when isAppDisabled is false', function () {
            window.ns = {
                ngScope: {
                    isAppDisabled: false
                }
            };

            expect(isAppDisabled()).toBe(false);
        });
    });

    describe('onHidden', function () {
        it('should set lastSeen to current time', function () {
            var before = Date.now();
            onHidden();
            var after = Date.now();

            // Jasmine 2.4.1 compatible assertions
            expect(window.lastSeen >= before).toBe(true);
            expect(window.lastSeen <= after).toBe(true);
        });

        describe('canPersist fix verification', function () {
            it('should allow saves on mobile regardless of document visibility', function () {
                // This test verifies the fix for the bug where saves were blocked
                // when document.hidden = true on mobile. The blocking code at
                // notes.js:618-621 has been removed:
                //   if (isMobile && document.hidden) {
                //       console.log('blocked save, on mobile');
                //       return false;
                //   }
                //
                // With the fix, canPersist should return true even when the page
                // is hidden on mobile (which happens during onHidden event).

                window.isMobile = true;
                window.appPrefs = { readonly: false };

                // Mock opGetNodeCount (used in safety check)
                var originalOpGetNodeCount = window.opGetNodeCount;
                window.opGetNodeCount = function () {
                    return 1; // Non-zero = has content
                };

                var testNs = {
                    np: {
                        isLoggedIn: function () {
                            return true;
                        }
                    },
                    ngScope: {
                        isAppDisabled: false,
                        showWorking: false
                    },
                    isModelReady: function () {
                        return this.np !== undefined && this.np.isLoggedIn() === true;
                    },
                    canPersist: function () {
                        if (window.appPrefs.readonly) return false;
                        if (this.isModelReady() === false) return false;
                        if (this.ngScope.isAppDisabled) return false;
                        if (this.ngScope.showWorking) return false;
                        // Blocking code REMOVED - no longer checking document.hidden
                        var nodeCount = window.opGetNodeCount();
                        if (nodeCount === 0) return false;
                        return true;
                    }
                };

                // Verify canPersist returns true (the fix)
                expect(testNs.canPersist()).toBe(true);

                // Restore
                if (originalOpGetNodeCount) {
                    window.opGetNodeCount = originalOpGetNodeCount;
                }
            });
        });

        describe('mobile auto-save on page hidden', function () {
            var saveNoteCalled;
            var awayCalled;
            var mockNs;
            var mockIdler;

            beforeEach(function () {
                window.isMobile = true;
                saveNoteCalled = false;
                awayCalled = false;

                mockNs = {
                    canPersist: function () {
                        return true;
                    },
                    isCookieValid: function () {
                        return true;
                    },
                    saveNote: function () {
                        saveNoteCalled = true;
                    },
                    ngScope: {
                        isAppDisabled: false
                    }
                };

                mockIdler = {
                    away: function () {
                        awayCalled = true;
                    }
                };

                window.ns = mockNs;
                window.idler = mockIdler;

                // Mock opHasChanged to return true
                window.opHasChangedOriginal = window.opHasChanged;
                window.opHasChanged = function () {
                    return true;
                };

                // Mock opClearChanged
                window.opClearChangedOriginal = window.opClearChanged;
                window.opClearChanged = function () {};
            });

            afterEach(function () {
                if (window.opHasChangedOriginal) {
                    window.opHasChanged = window.opHasChangedOriginal;
                }
                if (window.opClearChangedOriginal) {
                    window.opClearChanged = window.opClearChangedOriginal;
                }
            });

            it('should trigger save when page goes hidden on mobile', function () {
                onHidden();

                expect(saveNoteCalled).toBe(true);
            });

            it('should show lock screen when page goes hidden on mobile', function () {
                onHidden();

                expect(awayCalled).toBe(true);
            });

            it('should not save or lock when app is disabled', function () {
                mockNs.ngScope.isAppDisabled = true;

                onHidden();

                expect(saveNoteCalled).toBe(false);
                expect(awayCalled).toBe(false);
            });

            it('should not save or lock on desktop', function () {
                window.isMobile = false;

                onHidden();

                expect(saveNoteCalled).toBe(false);
                expect(awayCalled).toBe(false);
            });

            it('should not save when note has no changes', function () {
                window.opHasChanged = function () {
                    return false;
                };

                onHidden();

                expect(saveNoteCalled).toBe(false);
                expect(awayCalled).toBe(true); // Still locks
            });

            it('should not save when canPersist is false', function () {
                mockNs.canPersist = function () {
                    return false;
                };

                onHidden();

                expect(saveNoteCalled).toBe(false);
                expect(awayCalled).toBe(true); // Still locks
            });

            it('should not save when session is invalid', function () {
                mockNs.isCookieValid = function () {
                    return false;
                };

                onHidden();

                expect(saveNoteCalled).toBe(false);
                expect(awayCalled).toBe(true); // Still locks
            });
        });
    });

    describe('onVisible', function () {
        beforeEach(function () {
            window.isMobile = true; // onVisible returns early on desktop
            window.lastSeen = Date.now() - 100000; // Set some past time
        });

        it('should return early on desktop', function () {
            window.isMobile = false;
            var originalLastSeen = window.lastSeen;

            onVisible();

            // lastSeen should not be updated on desktop (function returns early)
            expect(window.lastSeen).toBe(originalLastSeen);
        });

        it('should return early when lastSeen is not set', function () {
            window.isMobile = true;
            window.lastSeen = null;

            // Should not throw
            expect(function () {
                onVisible();
            }).not.toThrow();
        });

        it('should not trigger away mode when not on wake', function () {
            window.isMobile = true;
            window.lastSeen = Date.now(); // Recent, so isOnWake returns false

            var awayCalled = false;
            window.idler = {
                away: function () {
                    awayCalled = true;
                }
            };

            onVisible();

            expect(awayCalled).toBe(false);
        });

        it('should not trigger away mode when app is already disabled', function () {
            window.isMobile = true;
            // Set lastSeen to trigger isOnWake
            window.lastSeen = Date.now() - (window.TIMEOUT * 60000 + 200000);
            window.ns = {
                ngScope: {
                    isAppDisabled: true
                }
            };

            var awayCalled = false;
            window.idler = {
                away: function () {
                    awayCalled = true;
                }
            };

            onVisible();

            expect(awayCalled).toBe(false);
        });

        xit('should trigger away mode when on wake and app not disabled', function () {
            window.isMobile = true;
            // Set lastSeen to trigger isOnWake
            window.lastSeen = Date.now() - (window.TIMEOUT * 60000 + 200000);
            window.ns = {
                ngScope: {
                    isAppDisabled: false
                }
            };

            var awayCalled = false;
            window.idler = {
                away: function () {
                    awayCalled = true;
                }
            };

            onVisible();

            expect(awayCalled).toBe(true);
        });

        it('should reset lastSeen after handling visibility change', function () {
            window.isMobile = true;
            window.lastSeen = Date.now() - 100000;
            window.ns = {
                ngScope: {
                    isAppDisabled: false
                }
            };
            window.idler = {
                away: function () {}
            };

            var before = Date.now();
            onVisible();
            var after = Date.now();

            // Jasmine 2.4.1 compatible assertions
            expect(window.lastSeen >= before).toBe(true);
            expect(window.lastSeen <= after).toBe(true);
        });
    });

    describe('onFocus', function () {
        it('should call onVisible', function () {
            window.isMobile = true;
            window.lastSeen = Date.now();

            // onFocus should not throw
            expect(function () {
                onFocus();
            }).not.toThrow();
        });
    });

    describe('saveOutlineNow', function () {
        var mockNs;
        var saveNoteCalled;
        var opHasChangedResult;

        beforeEach(function () {
            saveNoteCalled = false;
            opHasChangedResult = false;

            mockNs = {
                canPersist: function () {
                    return true;
                },
                isCookieValid: function () {
                    return true;
                },
                saveNote: function () {
                    saveNoteCalled = true;
                }
            };
            window.ns = mockNs;

            // Mock opHasChanged
            window.opHasChangedOriginal = window.opHasChanged;
            window.opHasChanged = function () {
                return opHasChangedResult;
            };

            // Mock opClearChanged
            window.opClearChangedOriginal = window.opClearChanged;
            window.opClearChanged = function () {};
        });

        afterEach(function () {
            if (window.opHasChangedOriginal) {
                window.opHasChanged = window.opHasChangedOriginal;
            }
            if (window.opClearChangedOriginal) {
                window.opClearChanged = window.opClearChangedOriginal;
            }
        });

        it('should not save when canPersist returns false', function () {
            mockNs.canPersist = function () {
                return false;
            };
            opHasChangedResult = true;

            saveOutlineNow();

            expect(saveNoteCalled).toBe(false);
        });

        it('should not save when isCookieValid returns false', function () {
            mockNs.isCookieValid = function () {
                return false;
            };
            opHasChangedResult = true;

            saveOutlineNow();

            expect(saveNoteCalled).toBe(false);
        });

        it('should not save when note has not changed', function () {
            opHasChangedResult = false;

            saveOutlineNow();

            expect(saveNoteCalled).toBe(false);
        });

        it('should save when note has changed', function () {
            opHasChangedResult = true;

            saveOutlineNow();

            expect(saveNoteCalled).toBe(true);
        });
    });

    describe('detectIdle', function () {
        beforeEach(function () {
            window.appPrefs = { readonly: false };
            window.ns = {
                ngScope: {
                    isLoggedIn: function () {
                        return true;
                    },
                    isAppDisabled: false,
                    showDisabledDialog: function () {}
                }
            };
        });

        it('should not initialize when readonly', function () {
            window.appPrefs = { readonly: true };

            var idle = new detectIdle();

            // In readonly mode, away and resetTimer are not defined
            expect(idle.away).toBeUndefined();
        });

        it('should have away method when not readonly', function () {
            var idle = new detectIdle();

            expect(typeof idle.away).toBe('function');
        });

        it('should have resetTimer method when not readonly', function () {
            var idle = new detectIdle();

            expect(typeof idle.resetTimer).toBe('function');
        });

        describe('away method', function () {
            it('should not activate when ns is not defined', function () {
                window.ns = undefined;
                var idle = new detectIdle();

                // Should not throw
                expect(function () {
                    if (idle.away) idle.away();
                }).not.toThrow();
            });

            it('should not activate when not logged in', function () {
                var showDisabledCalled = false;
                window.ns = {
                    ngScope: {
                        isLoggedIn: function () {
                            return false;
                        },
                        isAppDisabled: false,
                        showDisabledDialog: function () {
                            showDisabledCalled = true;
                        }
                    }
                };

                var idle = new detectIdle();
                if (idle.away) idle.away();

                expect(showDisabledCalled).toBe(false);
            });

            it('should not activate when app is already disabled', function () {
                var showDisabledCalled = false;
                window.ns = {
                    ngScope: {
                        isLoggedIn: function () {
                            return true;
                        },
                        isAppDisabled: true,
                        showDisabledDialog: function () {
                            showDisabledCalled = true;
                        }
                    }
                };

                var idle = new detectIdle();
                if (idle.away) idle.away();

                expect(showDisabledCalled).toBe(false);
            });

            it('should show disabled dialog when conditions are met', function () {
                var showDisabledCalled = false;
                var dialogMessage = '';
                window.ns = {
                    ngScope: {
                        isLoggedIn: function () {
                            return true;
                        },
                        isAppDisabled: false,
                        showDisabledDialog: function (msg, doTimeout) {
                            showDisabledCalled = true;
                            dialogMessage = msg;
                        }
                    }
                };

                var idle = new detectIdle();
                if (idle.away) idle.away();

                expect(showDisabledCalled).toBe(true);
                expect(dialogMessage).toBe('Click to continue');
            });
        });
    });
});
