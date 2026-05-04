const ModeHandler = {
    settings: {
        classic: { speed: 3.5, spacing: 190, spawn: 100, verticalSpeed: 0 },
        hardcore: { speed: 5.5, spacing: 160, spawn: 75, verticalSpeed: 2 }, // Added vertical movement
        zen: { speed: 2.5, spacing: 260, spawn: 120, verticalSpeed: 0 }
    },
    getCurrent: () => {
        const val = document.getElementById('game-mode').value;
        return ModeHandler.settings[val] || ModeHandler.settings.classic;
    }
};