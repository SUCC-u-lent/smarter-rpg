function getSearchText()
{ // Basically what classes or ids we're looking for.
    return [".dynasize"];
}

const watchedNodes = new WeakSet();
export async function setupCustomStyleClasses()
{
    findDynasizeElements()
    // inputs annotated with dynasize will have their width adjusted to fit their content.
    const mutationObserver = new MutationObserver((mutations) => {
        // When new nodes are added, we check if any of them (or their children) have the "dynasize" class and trigger
        // the input event to adjust their size accordingly.
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    findDynasizeElements()
                }
            });
        });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
}

function findDynasizeElements()
{
    const inputs = $(getSearchText().join(", "));
    inputs.each(function(){
        const element = $(this);
        const node = this;
        if (!(node instanceof HTMLElement)) return;
        if (watchedNodes.has(node)) return;
        watchedNodes.add(node);
        console.log("Found dynasize element, setting up:", element);
        element.on("input", function(){
            adjustInputSize(this);
        })
        .on("change", function(){
            adjustInputSize(this);
        })
        .trigger("input")
    })
}

/**
 * @param {HTMLElement|JQuery<HTMLElement>} inputElement
 */
function getTextValue(inputElement)
{
    let value;
    if ($(inputElement).is("input") || $(inputElement).is("textarea") || $(inputElement).is("select")) {
        value = $(inputElement).val();
    }
    else {
        value = $(inputElement).text();
    }
    if (typeof value === "string") {
        return value;
    }
    else if (typeof value === "number") {
        return value.toString();
    }
    else if (Array.isArray(value)) {
        return value.map(item => typeof item === "string" || typeof item === "number" ? item.toString() : "").join(", ");
    }
}

/**
 * @param {HTMLElement|JQuery<HTMLElement>} inputElement
 */
function adjustInputSize(inputElement)
{
    const value = getTextValue(inputElement) || "";
    const charWidth = Math.max(1,value.length)+"ch"

    let extraSizeNumber = 0;
    const extraSize = $(inputElement).data("extra-size")
    if (extraSize) {
        const extraSizeNum = parseInt(extraSize, 0)
        if (!isNaN(extraSizeNum)) {
            extraSizeNumber = extraSizeNum
        }
    }
    $(inputElement).css("width", `calc(${charWidth} + ${extraSizeNumber}px)`)
}