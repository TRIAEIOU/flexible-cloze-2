/** Get closest ancestor matching supplied selector */
function ancestor(descendant: HTMLElement|null|undefined, selector: string) {
    while (descendant && !descendant.matches(selector))
            descendant = descendant.parentElement
    return descendant
}

export { ancestor }