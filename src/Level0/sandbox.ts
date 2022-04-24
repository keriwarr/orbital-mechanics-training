export const getSandboxedFunction = <F extends Function>(code: string): F  =>{
    var frame = document.createElement('iframe');
    frame.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(frame);
    var win = frame.contentWindow,
        doc = win?.document;
    // for (var i in win) { if(vars) vars+=','; vars+=i; }
    if (!win || !doc) { throw new Error('iframe missing win or doc')}

    var script = doc.createElement('script');
    script.appendChild(doc.createTextNode(
        'window.result = (function(){"use strict";return ('+code+');})()'
    ));
    doc.body.appendChild(script);
    var result = (win as any).result;
    frame.parentNode?.removeChild(frame);
    return result;
}
