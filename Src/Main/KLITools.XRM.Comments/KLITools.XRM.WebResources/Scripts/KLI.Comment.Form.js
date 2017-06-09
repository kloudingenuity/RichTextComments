if (typeof (KLI) == "undefined") {
    KLI = { __namespace: true };
}

if (typeof (KLI.Comment) == "undefined") {
    KLI.Comment = { __namespace: true };
}

KLI.Comment.Form = (function () {
    function onLoad() {
        if (Xrm.Page.ui.getFormType() == 1) {
            if (Xrm.Page.getControl("WebResource_CommentEditor"))
                Xrm.Page.getControl("WebResource_CommentEditor").setFocus();
        }

        setSupportedCommentTypes();
    }

    // Private Functions
    function setSupportedCommentTypes() {
        var options = Xrm.Page.getAttribute("kli_commenttype").getOptions();

        var unSupportedCommentTypes = KLI.Comment.ServerOperations._retrieveUnSupportedCommentTypes(Xrm.Page.getAttribute("kli_regardingobjecttype").getValue());

        if (unSupportedCommentTypes != null && unSupportedCommentTypes.length > 0)
            $(options).each(function (index, option) {
                if ($.inArray(option.value, unSupportedCommentTypes) !== -1) {
                    Xrm.Page.getControl("kli_commenttype").removeOption(option.value);
                    return false;
                }
            });
    }

    return {
        OnLoad: onLoad
    }
})();