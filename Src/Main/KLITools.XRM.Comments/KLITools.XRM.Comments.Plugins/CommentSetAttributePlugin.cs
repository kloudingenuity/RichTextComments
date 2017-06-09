using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Client;

namespace KLITools.XRM.Comments.Plugins
{
    public class CommentSetAttributePlugin : IPlugin
    {
        public void Execute(IServiceProvider serviceProvider)
        {
            IPluginExecutionContext executionContext = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            IOrganizationServiceFactory serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
            IOrganizationService service = serviceFactory.CreateOrganizationService(executionContext.InitiatingUserId);
            OrganizationServiceContext sContext = new OrganizationServiceContext(service);
            ITracingService Trace = (ITracingService)serviceProvider.GetService(typeof(ITracingService));

            Trace.Trace("CommentSetAttributePlugin Execute Method - Start");

            try
            {
                //*********************************************
                //Message: Create 
                //Primary Entity: kli_comment 
                //Filtering Attribute: 
                //Pre Operation

                //Message: Update 
                //Primary Entity: kli_comment 
                //Filtering Attribute: 
                //Pre Operation
                //*********************************************
                
                if (executionContext.Stage == 20 && executionContext.PrimaryEntityName == "kli_comment")
                {
                    Entity entComment = (Entity)executionContext.InputParameters["Target"];

                    if (executionContext.MessageName.ToLower() == "create")
                    {
                        // Set Custom CreatedBy and ModifiedBy
                        if (!entComment.Attributes.Contains("kli_modifiedbyid") || entComment.Attributes["kli_modifiedbyid"] == null)
                        {
                            entComment.Attributes["kli_modifiedbyid"] = entComment.GetAttributeValue<EntityReference>("modifiedby").Id.ToString();
                            entComment.Attributes["kli_modifiedby"] = GetSystemUserName(entComment.GetAttributeValue<EntityReference>("modifiedby").Id, sContext, service);
                            entComment.Attributes["kli_modifiedbyobjecttypecode"] = 8;


                            entComment.Attributes["kli_createdbyid"] = entComment.GetAttributeValue<EntityReference>("modifiedby").Id.ToString();
                            entComment.Attributes["kli_createdby"] = entComment.Attributes["kli_modifiedby"];
                            entComment.Attributes["kli_createdbyobjecttypecode"] = 8;

                            Trace.Trace("CommentSetAttributePlugin Update CreatedBy & ModifiedBy");
                        }
                    }
                    else
                    {
                        // Set Custom ModifiedBy
                        if (!entComment.Attributes.Contains("kli_modifiedbyid") || entComment.Attributes["kli_modifiedbyid"] == null)
                        {
                            entComment.Attributes["kli_modifiedbyid"] = entComment.GetAttributeValue<EntityReference>("modifiedby").Id.ToString();
                            entComment.Attributes["kli_modifiedby"] = GetSystemUserName(entComment.GetAttributeValue<EntityReference>("modifiedby").Id, sContext, service);
                            entComment.Attributes["kli_modifiedbyobjecttypecode"] = 8;

                            Trace.Trace("CommentSetAttributePlugin Update ModifiedBy");
                        }
                    }

                    // Set First 96 chars of comment to Name filed
                    if (entComment.Attributes.Contains("kli_plaintextcomment") && entComment.Attributes["kli_plaintextcomment"] != null)
                    {
                        string strComment = entComment.Attributes["kli_plaintextcomment"].ToString().Replace("\n", " ");
                        entComment.Attributes["kli_name"] = strComment.Length > 96 ? strComment.Substring(0, 96) + "..." : strComment;

                        Trace.Trace("CommentSetAttributePlugin Update Name");
                    }
                }
            }
            catch (Exception ex)
            {
                throw new InvalidPluginExecutionException(ex.Message);
            }
            Trace.Trace("CommentSetAttributePlugin Execute Method - End");
        }

        private string GetSystemUserName(Guid guidUserId, OrganizationServiceContext sContext, IOrganizationService service)
        {
            var lstSystemUsers = (from s in sContext.CreateQuery("systemuser")
                              where s.GetAttributeValue<Guid>("systemuserid") == guidUserId
                              select s.GetAttributeValue<string>("fullname")).ToList();

            if (lstSystemUsers != null && lstSystemUsers.Count > 0)
                return lstSystemUsers[0];
            else
                return null;
        }
    }
}
