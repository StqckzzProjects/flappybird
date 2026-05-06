const ModeHandler = {
    settings: {
        classic:  { speed: 3.5, spacing: 190, spawn: 100, verticalSpeed: 0 },
        hardcore: { speed: 5.5, spacing: 160, spawn: 75,  verticalSpeed: 2 },
        zen:      { speed: 2.5, spacing: 260, spawn: 120, verticalSpeed: 0 }
    },
    getCurrent: () => {
        // Online host's mode wins if set via game-start
        const forced = window.__forcedMode;
        if (forced && ModeHandler.settings[forced]) return ModeHandler.settings[forced];
        const sel = document.getElementById('game-mode');
        const val = sel ? sel.value : 'classic';
        return ModeHandler.settings[val] || ModeHandler.settings.classic;
    }
};