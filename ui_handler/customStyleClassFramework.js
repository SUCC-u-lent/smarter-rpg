export async function setupCustomStyleClasses()
{
    // inputs annotated with dynasize will have their width adjusted to fit their content.
    $("input.dynasize").on("input", function(){
        const value = $(this).val() || ""
        const charWidth = Math.max(1,value.toString().length)+"ch"

        let extraSizeNumber = 0;
        const extraSize = $(this).data("extra-size")
        if (extraSize) {
            const extraSizeNum = parseInt(extraSize)
            if (!isNaN(extraSizeNum)) {
                extraSizeNumber = extraSizeNum
            }
        }
        $(this).css("width", `calc(${charWidth} + ${extraSizeNumber}px)`)
    });

}