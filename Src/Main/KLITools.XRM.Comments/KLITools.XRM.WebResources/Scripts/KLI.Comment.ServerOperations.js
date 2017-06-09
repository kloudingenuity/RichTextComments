if (typeof (KLI) == "undefined") {
    KLI = { __namespace: true };
}

if (typeof (KLI.Comment) == "undefined") {
    KLI.Comment = { __namespace: true };
}

KLI.Comment.ServerOperations = {
    _createRecord: function (htmlComment, plainTextComment, entityId, entityName, commentType, entityCode, commentRegardingAttributeName) {

        var returnValue = {};

        var currentUser = KLI.Comment.ServerOperations._getCurrentUserFullName();

        var entity = {};
        entity.kli_HTMLComment = encodeURIComponent(htmlComment);
        entity.kli_PlainTextComment = plainTextComment;
        entity.kli_CommentType = { Value: parseInt(commentType) };

        entity[commentRegardingAttributeName] = { Id: entityId, LogicalName: entityName };

        entity.kli_RegardingObjectType = { Value: parseInt(entityCode) };

        entity.kli_CreatedBy = currentUser.FullName;
        entity.kli_CreatedById = currentUser.SystemUserId;
        entity.kli_CreatedByObjectTypeCode = 8;
        entity.kli_ModifiedBy = currentUser.FullName;
        entity.kli_ModifiedById = currentUser.SystemUserId;
        entity.kli_ModifiedByObjectTypeCode = 8;

        XrmServiceToolkit.Rest.Create(entity, 'kli_commentSet',
                        function (result) {
                            returnValue.Id = result.kli_commentId;
                            returnValue.CommentType = parseInt(commentType);
                            returnValue.Success = true;
                            returnValue.ErrorMessage = '';
                        },
                        function (error) {
                            returnValue.Id = '';
                            returnValue.Success = false;
                            if (error === undefined || error == null)
                                returnValue.ErrorMessage = error;
                            else
                                returnValue.ErrorMessage = error;
                        },
                    false);

        return returnValue;
    },

    _retriveAllComments: function (entityId, entityName, commentRegardingAttributeName) {
        var commentCollection = [];
        var filterCondition = [];
        var linkEntityCondition = [];
        var desc = $("input[name='orderby_method']:checked").length === 0 ? true : $("input[name='orderby_method']:checked").val();

        //var conditions = null;//KLI.Comment.ServerOperations._hasSupportPrivilege(entityCode);

        //if (conditions == null)
        filterCondition = ['<filter type="and">',
                            '<condition attribute="statecode" operator="eq" value="0" />',
                            '</filter>'].join('');
        //else
        //    filterCondition = ['<filter type="and">',
        //                        '<condition attribute="statecode" operator="eq" value="0" />',
        //                          '<condition attribute="kli_commenttype" operator="not-in">',
        //                                conditions,
        //                          '</condition>',
        //                        '</filter>'].join('');

        linkEntityCondition = ['<link-entity name="' + entityName + '" from="' + entityName + 'id" to="' + commentRegardingAttributeName + '" alias="re">',
                               '<attribute name="statecode" />',
                             '<filter type="and">',
                               '<condition attribute="' + entityName + 'id" operator="eq" value="',
                               entityId, '" />',
                             '</filter>',
                           '</link-entity>'].join('');

        var fetchString = ['<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">',
                          '<entity name="kli_comment">',
                            '<attribute name="modifiedon" />',
                            '<attribute name="createdon" />',
                            //'<attribute name="kli_lastmodifiedon" />',
                            '<attribute name="kli_commenttype" />',
                            '<attribute name="kli_htmlcomment" />',
                            '<attribute name="kli_commentid" />',
                            '<attribute name="kli_modifiedby" />',
                            '<attribute name="kli_createdby" />',
                            '<attribute name="kli_modifiedbyid" />',
                            '<attribute name="kli_createdbyid" />',
                            '<attribute name="kli_modifiedbyobjecttypecode" />',
                            '<attribute name="kli_createdbyobjecttypecode" />',
                            '<attribute name="modifiedby" />',
                            '<attribute name="createdby" />',
                            '<attribute name="kli_origincode" />',
                            //'<order attribute="kli_lastmodifiedon" descending="', desc, '" />',
                            '<order attribute="createdon" descending="', desc, '" />',
                            filterCondition,
                            linkEntityCondition,
                            '<link-entity name="systemuser" from="systemuserid" to="createdby" link-type="outer" alias="su">',
                                '<attribute name="entityimage" />',
                            '</link-entity>',
                          '</entity>',
                        '</fetch>'].join('');

        var commentEntities = null;

        try {
            commentEntities = XrmServiceToolkit.Soap.Fetch(fetchString);
        }
        catch (e) {
            alert(e.message);
        }

        if (commentEntities == null || commentEntities.length <= 0) {
            return commentCollection;
        }

        //var portalServiceUser = KLI.Comment.ServerOperations._portalServiceUser();

        for (var i = 0; i < commentEntities.length; i++) {
            if (commentEntities[i].attributes) {
                var entComment = commentEntities[i].attributes;
                var obj = {};

                if (entComment.kli_htmlcomment == null)
                    obj.Comment = "";
                else {
                    try {
                        obj.Comment = decodeURIComponent(entComment.kli_htmlcomment.value);
                    }
                    catch (err) {
                        obj.Comment = (entComment.kli_htmlcomment.value);
                    }

                    // Remove NewLine Chars from Comment
                    var pattern = new RegExp("<(\"[^\"]*\"|'[^']*'|[^'\">])*>", "i"); //RegExp("<[a-z][\s\S]*>", "i");
                    var regExIsHTML = pattern.exec(obj.Comment);

                    if (regExIsHTML == null || obj.Comment.indexOf("<b>L3 Consultation Request:</b>") > -1)
                        obj.Comment = obj.Comment.replace(new RegExp("\r\n?|\n", "g"), "<br />");
                }

                obj.CommentType = entComment.kli_commenttype ? entComment.kli_commenttype.value : 1;
                obj.CommentTypeName = entComment.kli_commenttype ? entComment.kli_commenttype.formattedValue : "";
                obj.OriginCode = entComment.kli_origincode ? entComment.kli_origincode.value : 855480000; // 855480000 - CRM ; 855480001 - Portal

                obj.CreatedById = entComment.kli_createdbyid != null ? entComment.kli_createdbyid.value : ((obj.OriginCode == 855480001) ? null : entComment.createdby.id);
                obj.ModifiedById = entComment.kli_modifiedbyid != null ? entComment.kli_modifiedbyid.value : ((obj.OriginCode == 855480001) ? null : entComment.modifiedby.id);
                obj.CreatedByName = entComment.kli_createdby != null ? entComment.kli_createdby.value : entComment.createdby.name;
                obj.ModifiedByName = entComment.kli_modifiedby != null ? entComment.kli_modifiedby.value : entComment.modifiedby.name;

                //obj.CreatedByType = (portalServiceUser.SystemUserId == entComment.createdby.id) ? 2 : 8;
                //obj.ModifiedByType = (portalServiceUser.SystemUserId == entComment.modifiedby.id) ? 2 : 8;
                obj.CreatedByType = entComment.kli_createdbyobjecttypecode != null ? entComment.kli_createdbyobjecttypecode.value : 8;
                obj.ModifiedByType = entComment.kli_modifiedbyobjecttypecode != null ? entComment.kli_modifiedbyobjecttypecode.value : 8;


                obj.IsUserImageExists = (obj.CreatedByType == 8 && (entComment.su != null && entComment.su.entityimage != null)) ? true : false;

                obj.ModifiedOn = entComment.modifiedon.formattedValue;
                obj.CreatedOn = entComment.createdon.formattedValue;
                obj.LastModifiedOn = obj.ModifiedOn;//entComment.kli_lastmodifiedon != null ?
                //                        entComment.kli_lastmodifiedon.formattedValue : entComment.modifiedon.formattedValue;
                obj.CommentId = commentEntities[i].id;
                obj.IsModified = (obj.CreatedOn == obj.ModifiedOn) ? "none" : "inline";
                obj.ParentState = entComment['re.statecode'] != null ? Number(entComment['re.statecode'].value) : 0;
                obj.RegardingEntity = entityName;
                commentCollection.push(obj);
            }
        }

        return commentCollection;
    },

    _getCurrentUserFullName: function () {
        var serverUrl;
        if (Xrm.Page.context.getClientUrl !== undefined) {
            serverUrl = Xrm.Page.context.getClientUrl();
        } else {
            serverUrl = Xrm.Page.context.getServerUrl();
        }
        var userId;
        if (Xrm.Page.context.getUserId() !== undefined) {
            userId = Xrm.Page.context.getUserId();
        } else {
            userId = parent.Xrm.Page.context.getUserId();
        }

        var retrievedUser = null;

        XrmServiceToolkit.Rest.Retrieve(userId, "SystemUserSet", "SystemUserId, DomainName, FullName", null, function (e) { retrievedUser = e; }, function (err) { alert(err); }, false);

        return retrievedUser;
    },

    _retrieveUnSupportedCommentTypes: function (entityCode) {
        var unSupportedTypes = new Array();

        var roleNames = KLI.Comment.ServerOperations._getRoleNames();

        if (roleNames != null && roleNames.length > 0) {
            var applicableRoles = KLI.Comment.ServerOperations._retrieveApplicableRoles(entityCode);
            if (applicableRoles != null) {

                for (var i = 0; i < applicableRoles.length; i++) {
                    var hasPrivilege = false;

                    $(roleNames).each(function (index, value) {
                        if ($.inArray(value, $.map(applicableRoles[i].ApplicableRoles.split(";"), $.trim)) !== -1) {
                            hasPrivilege = true;
                            return false;
                        }
                    });

                    if (!hasPrivilege)
                        unSupportedTypes.push(applicableRoles[i].CommentType);
                }
            }
        }
        return unSupportedTypes;
    },

    _hasSupportPrivilege: function (entityCode) {
        var roles;
        var filterCondition = "";

        if (Xrm.Page.context.getUserRoles() !== undefined)
            roles = Xrm.Page.context.getUserRoles();
        else
            roles = parent.Xrm.Page.context.getUserRoles();

        if (roles != null && roles.length != 0) {
            var applicableRoles = KLI.Comment.ServerOperations._retrieveApplicableRoles(entityCode);
            if (applicableRoles != null) {
                //var applicableRoles = $.map(strRoles.split(";"), $.trim);
                //for (var i = 0; i < roles.length; i++) {
                //var roleRecord = null;

                //XrmServiceToolkit.Rest.Retrieve(roles[i], "RoleSet", "Name", null, function (e) { roleRecord = e; }, function (err) { roleRecord = null; }, false);

                //if (roleRecord != null && roleRecord.Name != null) {
                //    if ($.inArray(roleRecord.Name, applicableRoles) !== -1) {
                //        hasPrivilege = true;
                //        break;
                //    }
                //}

                var roleNames = KLI.Comment.ServerOperations._getRoleNames();

                for (var i = 0; i < applicableRoles.length; i++) {
                    var hasPrivilege = false;

                    if (roleNames != null && roleNames.length > 0) {
                        $(roleNames).each(function (index, value) {
                            if ($.inArray(value, $.map(applicableRoles[i].ApplicableRoles.split(";"), $.trim)) !== -1) {
                                hasPrivilege = true;
                                return false;
                            }
                        });
                    }

                    if (!hasPrivilege)
                        filterCondition += "<value>" + applicableRoles[i].CommentType + "</value>";
                }

                //}
            }
        }
        return (filterCondition == "" ? null : filterCondition);
    },

    _checkUserHasPrevilege: function (privilegeId) {
        var userId;
        var hasPrivilege = false;

        if (Xrm.Page.context.getUserId() !== undefined) {
            userId = Xrm.Page.context.getUserId();
        } else {
            userId = parent.Xrm.Page.context.getUserId();
        }

        if (userId == null) return false;

        var request = ["<request i:type=\'c:RetrieveUserPrivilegesRequest\' xmlns:a=\'http://schemas.microsoft.com/xrm/2011/Contracts\' xmlns:c=\'http://schemas.microsoft.com/crm/2011/Contracts\'>",
                    "    <a:Parameters xmlns:b=\'http://schemas.datacontract.org/2004/07/System.Collections.Generic\'>",
                    "        <a:KeyValuePairOfstringanyType>",
                    "            <b:key>UserId</b:key>",
                    "            <b:value i:type=\'d:guid\' xmlns:d=\'http://schemas.microsoft.com/2003/10/Serialization/\'>" + userId + "</b:value>",
                    "        </a:KeyValuePairOfstringanyType>",
                    "    </a:Parameters>",
                    "    <a:RequestId i:nil=\'true\' />",
                    "    <a:RequestName>RetrieveUserPrivileges</a:RequestName>",
                    "</request>"].join("");

        var result = XrmServiceToolkit.Soap.Execute(request);

        if (result != null) {
            var resultNodes = KLI.Comment.ServerOperations._selectSingleNode(result, "//a:Results");
            resultNodes = resultNodes.childNodes[0].childNodes[1];

            var nodes = [];

            for (var i = 0, ilength = resultNodes.childNodes.length; i < ilength; i++) {
                nodes[i] = resultNodes.childNodes[i].childNodes[2].firstChild.nodeValue;
            }

            if (nodes.length > 0) {
                var match = $.grep(nodes, function (e) { return e == privilegeId; });
                if (match.length > 0)
                    hasPrivilege = true;
            }
        }
        return hasPrivilege;
    },

    _checkPrivilegeDepth: function (privilegeId, roleId) {
        // Get Parent RoleId
        var fetchString = ['<fetch distinct="false" no-lock="false" mapping="logical" >',
                                 '   <entity name="role" >',
                                 '       <attribute name="parentroleid" />',
                                 '       <filter type="and" >',
                                 '           <condition attribute="roleid" operator="eq" value="' + roleId + '" />',
                                 '       </filter>',
                                 '   </entity>',
                                 '</fetch>'].join('');
        var results = XrmServiceToolkit.Soap.Fetch(fetchString);

        if (results != null && results.length > 0 && results[0].attributes.parentroleid != null && results[0].attributes.parentroleid.id != null)
            roleId = results[0].attributes.parentroleid.id;

        fetchString = ['<fetch distinct="false" no-lock="false" mapping="logical" >',
                                 '   <entity name="roleprivileges" >',
                                 '       <attribute name="privilegedepthmask" />',
                                 '       <filter type="and" >',
                                 '           <condition attribute="privilegeid" operator="eq" value="' + privilegeId + '" />',
                                 '           <condition attribute="roleid" operator="eq" value="' + roleId + '" />',
                                 '       </filter>',
                                 '   </entity>',
                                 '</fetch>'].join('');
        results = XrmServiceToolkit.Soap.Fetch(fetchString);

        if (results != null && results.length > 0 && results[0].attributes.privilegedepthmask != null && results[0].attributes.privilegedepthmask.value != null)
            return results[0].attributes.privilegedepthmask.value;
        else
            return null;
    },

    _retrievePrivilegesByName: function (previlegeName) {
        var fetchString = ['<fetch distinct="false" no-lock="false" mapping="logical" >',
                             '   <entity name="privilege" >',
                             '       <attribute name="privilegeid" />',
                             '       <filter type="and" >',
                             '           <condition attribute="name" operator="eq" value="' + previlegeName + '" />',
                             '       </filter>',
                             '   </entity>',
                             '</fetch>'].join('');
        var results = XrmServiceToolkit.Soap.Fetch(fetchString);

        if (results != null && results.length > 0 && results[0].attributes.privilegeid != null)
            return results[0].attributes.privilegeid.value;
        else
            return null;
    },

    _retrieveApplicableRoles: function (entityCode) {
        var applicableRoles = [];

        try {
            var fetchString = ['<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">',
							  '<entity name="kli_commentconfigurationitem">',
								'<attribute name="kli_allowedsecurityroles" />',
								'<attribute name="kli_commenttype" />',
								'<filter type="and">',
									'<condition attribute="statecode" operator="eq" value="0" />',
									'<condition attribute="kli_regardingobjecttype" operator="eq" value="' + entityCode + '" />',
								 '</filter>',
							  '</entity>',
							'</fetch>'].join('');

            var results = XrmServiceToolkit.Soap.Fetch(fetchString);

            for (var i = 0; i < results.length; i++) {
                var obj = {};
                obj.CommentType = results[i].attributes.kli_commenttype.value;
                obj.ApplicableRoles = results[i].attributes.kli_allowedsecurityroles.value;

                var tmpItem = $.grep(applicableRoles, function (n, i) {
                    return (n.CommentType == obj.CommentType);
                });

                if (tmpItem != null && tmpItem.length > 0) {
                    obj.ApplicableRoles = obj.ApplicableRoles + ";" + tmpItem[0].ApplicableRoles;

                    applicableRoles[$.map(applicableRoles, function (n, i) {
                        if (n.CommentType == tmpItem[0].CommentType)
                            return i;
                    })] = obj;
                }
                else
                    applicableRoles.push(obj);
            }
        }
        catch (e) {
            alert(e.message);
        }

        if (applicableRoles != null && applicableRoles.length > 0)
            return applicableRoles;
        else
            return null;
    },

    _getRoleNames: function () {
        var roles;

        if (Xrm.Page.context.getUserRoles() !== undefined)
            roles = Xrm.Page.context.getUserRoles();
        else
            roles = parent.Xrm.Page.context.getUserRoles();

        var filterCondition = "";

        for (var i = 0; i < roles.length; i++)
            filterCondition += '<condition attribute="roleid" operator="eq" value="' + roles[i] + '" />';

        var fetchString = ['<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">',
                          '<entity name="role">',
                            '<attribute name="name" />',
                            '<filter type="or">',
                                filterCondition,
                             '</filter>',
                          '</entity>',
                        '</fetch>'].join('');

        var results = XrmServiceToolkit.Soap.Fetch(fetchString);

        roles = new Array();
        if (results != null && results.length > 0) {
            for (var i = 0; i < results.length; i++)
                roles.push(results[i].attributes.name.value);
            return roles;
        }
        else
            return null;
    },

    _selectSingleNode: function (node, xpathExpr) {
        if (typeof (node.selectSingleNode) != "undefined") {
            return node.selectSingleNode(xpathExpr);
        }
        else {
            var xpe = new XPathEvaluator();
            var results = xpe.evaluate(xpathExpr, node, KLI.Comment.ServerOperations._NSResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            return results.singleNodeValue;

        }
    },

    _selectNodes: function (node, XPathExpression) {
        if (typeof (node.selectNodes) != "undefined" && typeof (node.selectNodes) != "unknown") {
            return node.selectNodes(XPathExpression);
        }
        else if (typeof (node.evaluate) != "undefined" && typeof (node.evaluate) != "unknown") {
            var output = [];
            var XPathResults = node.evaluate(XPathExpression, node, KLI.Comment.ServerOperations._NSResolver, XPathResult.ANY_TYPE, null);
            var result = XPathResults.iterateNext();
            while (result) {
                output.push(result);
                result = XPathResults.iterateNext();
            }
            return output;
        }
        else
            return node.getElementsByTagName(XPathExpression.replace("//", ""));
    },

    _NSResolver: function (prefix) {
        var ns = {
            "s": "http://schemas.xmlsoap.org/soap/envelope/",
            "a": "http://schemas.microsoft.com/xrm/2011/Contracts",
            "i": "http://www.w3.org/2001/XMLSchema-instance",
            "b": "http://schemas.datacontract.org/2004/07/System.Collections.Generic",
            "c": "http://schemas.microsoft.com/xrm/2011/Metadata"
        };
        return ns[prefix] || null;
    }
}