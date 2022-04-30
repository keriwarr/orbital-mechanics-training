export const getSandboxedFunction = <F extends Function>(code: string): F => {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(frame);

    const win = frame.contentWindow,
        doc = win?.document;
    if (!win || !doc) { throw new Error('iframe missing win or doc') }

    // @ts-ignore
    win.console = console;

    const script = doc.createElement('script');
    script.appendChild(doc.createTextNode(
        'window.result = (function(){"use strict";return (' + code + ');})()'
    ));
    doc.body.appendChild(script);
    const result = (win as any).result;

    frame.parentNode?.removeChild(frame);

    return result;
}
