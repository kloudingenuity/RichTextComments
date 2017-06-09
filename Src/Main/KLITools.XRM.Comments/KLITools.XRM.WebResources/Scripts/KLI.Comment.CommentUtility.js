if (typeof (KLI) == "undefined") {
    KLI = { __namespace: true };
}

if (typeof (KLI.Comment) == "undefined") {
    KLI.Comment = { __namespace: true };
}

KLI.Comment.CommentUtility = {
    _openNewRecord: function (entityId, entityName, entityTypeCode, commentRegardingAttributeName) {
        var _serverUrl = Xrm.Page.context.getClientUrl();

        if (entityId != "") {
            //// verify privilege
            var privilegeId = KLI.Comment.ServerOperations._retrievePrivilegesByName("prvCreatekli_comment");
            if (privilegeId != null) {
                if (!KLI.Comment.ServerOperations._checkUserHasPrevilege(privilegeId)) {
                    alert("You do not have required privileges to create comments.");
                    return;
                }
            }

            //debugger;
            //var queryStringData = "";
            //queryStringData = encodeURIComponent("EntityId=" + entityId + "&EntityName=" + entityName);// + "&DatTimeNow=" + KLI.Comment.CommentUtility._getDatetime());
            //var _webresourceUrl = _serverUrl + "/Webresources/kli_/HTML/CommentFormEditor.html?data=" + queryStringData;

            //var queryStringData = encodeURIComponent(commentRegardingAttributeName + "=" + entityId + "&kli_regardingobjecttype=" + entityTypeCode);
            //var _webresourceUrl = Xrm.Page.context.getClientUrl() + "/main.aspx?etn=kli_comment&pagetype=entityrecord&extraqs=" + queryStringData;

            //Xrm.Utility.openWebResource("kli_/HTML/CommentEditor.html?data=" + queryStringData);
            //var dialogOption = new Xrm.DialogOptions;
            //dialogOption.width = 700;
            //dialogOption.height = 465;

            //setTimeout(
            //    function () {
            //        debugger;
            //        if (parent.top.$("#InlineDialog").length > 0 && parent.top.$("#InlineDialog_Iframe").length <= 0) {
            //            var iFrame = $("<iframe>").attr("id", "InlineDialog_Iframe").attr("name", "InlineDialog_Iframe").attr("src", _webresourceUrl).attr("style", "height: 450px; width: 650px; border: 0px;");
            //            parent.top.$("#InlineDialog").attr("tabindex", "1").attr("style", "position: absolute; top: 50%; left: 50%; z-index: 1006; margin-top: -200px; margin-left: -300px;height: 450px; width: 650px;").append(iFrame);
            //        }
            //    }, 1000);
            debugger;
            //Xrm.Internal.openDialog(Mscrm.CrmUri.create(_webresourceUrl).toString(),
            //            dialogOption,
            //            null,
            //            null,
            //            KLI.Comment.CommentUtility._newRecordCallback);

            var parameters = {};
            parameters[commentRegardingAttributeName] = entityId;
            parameters["kli_regardingobjecttype"] = entityTypeCode;

            var windowOptions = {
                openInNewWindow: true
            };

            var t = Xrm.Utility.openEntityForm("kli_comment", null, parameters, windowOptions);
        }
        else {
            alert("The form must be saved before adding comments.");
            return;
        }
    },

    _openExistingRecord: function (obj, entityName) {
        var windowOptions = {
            openInNewWindow: true
        };

        var t = Xrm.Utility.openEntityForm("kli_comment", obj.data['Id'], null, windowOptions);
    },

    _newRecordCallback: function (returnValue) {
        if (returnValue && returnValue == "Cancel") {
            // do nothing.
        }
        else if (returnValue && returnValue.Success) {
            BindData();

            // Refresh Parent if updated on Popup
            if (window.name == "CommnetsPopup")
                window.parent.opener.parent.Xrm.Page.getControl("WebResource_Comments").setSrc(window.parent.opener.parent.Xrm.Page.getControl("WebResource_Comments").getSrc());

            if (returnValue.CommentType == 475770000) {
                if (window.name == "CommnetsPopup")
                    window.parent.opener.parent.SetFirstResponseSent();
                else
                    window.parent.SetFirstResponseSent();
            }
        }
    },

    _getDatetime: function () {
        var d = new Date();
        var month = d.getMonth() + 1;
        var year = d.getYear();
        var day = d.getDay();
        var min = d.getMinutes()
        var sec = d.getSeconds();
        var mise = d.getMilliseconds();
        var curentTime = year + "_" + month + "_" + day + "_" + min + "_" + sec + "_" + mise;
        return curentTime;
    }
}