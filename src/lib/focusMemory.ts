// Tracks the most recently focused element across the app so that when
// the user presses back to jump up to the top nav, pressing down again
// can restore focus to where they were instead of letting RN-TV's
// spatial fallback pick the closest focusable.

let lastHandle: number | null = null;

export function rememberFocus(handle: number | null | undefined): void
{
    if (handle != null) lastHandle = handle;
}

export function getRememberedFocus(): number | null
{
    return lastHandle;
}

export function clearRememberedFocus(): void
{
    lastHandle = null;
}
