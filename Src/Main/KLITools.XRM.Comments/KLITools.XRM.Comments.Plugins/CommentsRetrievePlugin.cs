using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Client;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Crm.Sdk.Messages;

namespace KLITools.XRM.Comments.Plugins
{
    public class CommentsRetrievePlugin : IPlugin
    {
        public void Execute(IServiceProvider serviceProvider)
        {
            try
            {
                IPluginExecutionContext executionContext = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
                IOrganizationServiceFactory serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
                IOrganizationService service = serviceFactory.CreateOrganizationService(executionContext.InitiatingUserId);
                OrganizationServiceContext sContext = new OrganizationServiceContext(service);
                ITracingService Trace = (ITracingService)serviceProvider.GetService(typeof(ITracingService));

                Trace.Trace("CommentsRetrievePlugin Execute Method - Start");
                new InvalidPluginExecutionException("");
                //if (executionContext.Stage == 20 && executionContext.MessageName.Equals("RetrieveMultiple"))
                if (executionContext.MessageName.Equals("RetrieveMultiple"))
                {                    
                    if (executionContext.InputParameters.Contains("Query") && executionContext.InputParameters["Query"] is QueryExpression)
                    {
                        // Verify User Roles
                        FilterExpression FilterConditions = SetCommentFilterConditions(executionContext, sContext, service);

                        // Get the QueryExpression from the property bag
                        if (FilterConditions.Filters.Count > 0)
                        {
                            QueryExpression objQueryExpression = (QueryExpression)executionContext.InputParameters["Query"];
                            objQueryExpression.Criteria.AddFilter(FilterConditions);
                        }
                    }
                    else if (executionContext.InputParameters.Contains("Query") && executionContext.InputParameters["Query"] is FetchExpression)
                    {
                        FetchExpression query = (FetchExpression)executionContext.InputParameters["Query"];
                        string fetchXml = (executionContext.InputParameters["Query"] as FetchExpression).Query;

                        var fetchXmlToQueryExpressionRequest = new FetchXmlToQueryExpressionRequest
                        {
                            FetchXml = fetchXml
                        };

                        var fetchXmlToQueryExpressionResponse = (FetchXmlToQueryExpressionResponse)service.Execute(fetchXmlToQueryExpressionRequest);

                        // Verify User Roles
                        FilterExpression FilterConditions = SetCommentFilterConditions(executionContext, sContext, service);

                        QueryExpression objQueryExpression = null;

                        // Get the QueryExpression from the property bag
                        if (FilterConditions.Filters.Count > 0)
                        {
                            objQueryExpression = fetchXmlToQueryExpressionResponse.Query;
                            objQueryExpression.Criteria.AddFilter(FilterConditions);

                            // Convert the query expression to FetchXML.
                            var queryExpressionToFetchXmlRequest = new QueryExpressionToFetchXmlRequest
                            {
                                Query = objQueryExpression
                            };
                            var queryExpressionToFetchXmlResponse =
                                (QueryExpressionToFetchXmlResponse)service.Execute(queryExpressionToFetchXmlRequest);

                            executionContext.InputParameters["Query"] = new FetchExpression(queryExpressionToFetchXmlResponse.FetchXml);  
                        }                      
                    }
                }
                else if (executionContext.MessageName.Equals("Retrieve"))
                {
                    if (executionContext.OutputParameters.Contains("BusinessEntity") && executionContext.OutputParameters["BusinessEntity"] is Entity &&
                        ((Entity)executionContext.OutputParameters["BusinessEntity"]).LogicalName == "kli_comment")
                    {
                        Entity entComment = ((Entity)executionContext.OutputParameters["BusinessEntity"]);

                        if (entComment.Attributes.Contains("kli_commenttype"))
                        { // Support Comment

                            // Verify User Roles
                            bool isValidUser = IsValidUser(((Microsoft.Xrm.Sdk.OptionSetValue)((entComment).Attributes["kli_commenttype"])).Value,
                                ((Microsoft.Xrm.Sdk.OptionSetValue)((entComment).Attributes["kli_regardingobjecttype"])).Value,
                                executionContext, sContext, service);

                            if (!isValidUser)
                            {
                                throw new InvalidPluginExecutionException("You dont have required privileges to open the case comment.");
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new InvalidPluginExecutionException(ex.Message);
            }
        }

        /// <summary>
        /// Verify if user has specified privileges
        /// </summary>
        /// <param name="commentType"></param>
        /// <param name="regardingObjectType"></param>
        /// <param name="executionContext"></param>
        /// <param name="sContext"></param>
        /// <param name="service"></param>
        /// <returns></returns>
        public bool IsValidUser(int commentType, int regardingObjectType, IPluginExecutionContext executionContext, OrganizationServiceContext sContext, IOrganizationService service)
        {
            bool isValidUser = true;

            // Retrieve list of allowed security roles
            var listApplicableRoles = (from r in sContext.CreateQuery("kli_commentconfigurationitem")
                                       where r.GetAttributeValue<OptionSetValue>("statecode").Value == 0 // Active
                                                && r.GetAttributeValue<OptionSetValue>("kli_commenttype").Value == commentType
                                                && r.GetAttributeValue<OptionSetValue>("kli_regardingobjecttype").Value == regardingObjectType
                                       select new
                                       {
                                           kli_allowedsecurityroles = r.GetAttributeValue<string>("kli_allowedsecurityroles")
                                       }).ToList();

            if (listApplicableRoles != null && listApplicableRoles.Count > 0)
            {                            
                // Retrieve list of assigned security roles for the user
                var listUserRoles = (from r in sContext.CreateQuery("role")
                                 join ur in sContext.CreateQuery("systemuserroles") on r.GetAttributeValue<Guid>("roleid") equals ur.GetAttributeValue<Guid>("roleid")
                                 where ur.GetAttributeValue<Guid>("systemuserid") == executionContext.InitiatingUserId
                                 select r.GetAttributeValue<string>("name")).ToList();

                // Verify if User has any applicable roles
                var applicableRoles = listApplicableRoles
                                      .Where(e => (e.kli_allowedsecurityroles.Split(';').Select(i => i.Trim()).Where(i => !string.IsNullOrWhiteSpace(i))).Where(j => listUserRoles.Contains(j)).ToList().Count <= 0).ToList();
                
                if (applicableRoles != null && applicableRoles.Count > 0)
                {
                    isValidUser = false;
                }
            }
            return isValidUser;
        }

        /// <summary>
        /// Set Unauthorized Comment filter conditions
        /// </summary>
        /// <param name="executionContext"></param>
        /// <param name="sContext"></param>
        /// <param name="service"></param>
        /// <returns></returns>
        public FilterExpression SetCommentFilterConditions(IPluginExecutionContext executionContext, OrganizationServiceContext sContext, IOrganizationService service)
        {
            //string strFetchFilterConditions = string.Empty;
            //string strFilter = "<filter type='and'>{0}</filter>";
            //string strFilterCondition = "<condition attribute='kli_commenttype' operator='ne' value={0} /><condition attribute='kli_regardingobjecttype' operator='eq' value='{1}' />";

            FilterExpression FilterConditions = new FilterExpression();
            FilterConditions.FilterOperator = LogicalOperator.Or;

            // Retrieve list of application security roles for the comment types
            var listApplicableRoles = (from r in sContext.CreateQuery("kli_commentconfigurationitem")
                                       where r.GetAttributeValue<OptionSetValue>("statecode").Value == 0 // Active
                                       select new
                                       {
                                           kli_allowedsecurityroles = r.GetAttributeValue<string>("kli_allowedsecurityroles"),
                                           kli_commenttype = r.GetAttributeValue<OptionSetValue>("kli_commenttype"),
                                           kli_regardingobjecttype = r.GetAttributeValue<OptionSetValue>("kli_regardingobjecttype")
                                       }).ToList();

            if (listApplicableRoles != null && listApplicableRoles.Count > 0)
            {
                var applicableRoles = listApplicableRoles.GroupBy(i => new { i.kli_commenttype, i.kli_regardingobjecttype })
                                        .Select(g => new { kli_commenttype = g.FirstOrDefault().kli_commenttype, kli_regardingobjecttype = g.FirstOrDefault().kli_regardingobjecttype, kli_allowedsecurityroles = string.Join(";", g.Select(i => i.kli_allowedsecurityroles)) })
                                        .ToList();

                // Retrieve list of security roles for the user
                var listUserRoles = (from r in sContext.CreateQuery("role")
                                     join ur in sContext.CreateQuery("systemuserroles") on r.GetAttributeValue<Guid>("roleid") equals ur.GetAttributeValue<Guid>("roleid")
                                     where ur.GetAttributeValue<Guid>("systemuserid") == executionContext.InitiatingUserId
                                     select r.GetAttributeValue<string>("name")).ToList();

                if (listUserRoles != null && listUserRoles.Count > 0)
                {
                    //listRoles.Where(e => (lstAllowedRoles.Contains(e.Name))).ToList<Role>();

                    var tempObject = applicableRoles.Where(e => (e.kli_allowedsecurityroles.Split(';').Select(i => i.Trim()).Where(i => !string.IsNullOrWhiteSpace(i))).Where(j => listUserRoles.Contains(j)).ToList().Count <= 0).ToList();

                    var unAuthorizedCommentTypes = tempObject
                                                    .GroupBy(e => e.kli_regardingobjecttype)
                                                    .Select(e => new { kli_regardingobjecttype = e.FirstOrDefault().kli_regardingobjecttype, kli_commenttype = string.Join(";", e.Select(i => i.kli_commenttype.Value.ToString())) }).ToList();

                    FilterExpression fexp = new FilterExpression();
                    fexp.FilterOperator = LogicalOperator.And;                    
                    
                    for (int i = 0; i < unAuthorizedCommentTypes.Count; i++)
                    {
                        string strConditions = string.Empty;

                        //foreach (string strCommentType in unAuthorizedCommentTypes[i].kli_commenttype.Split(new char [] { ';'}, StringSplitOptions.RemoveEmptyEntries))                        
                        {
                            //strConditions += string.Format(strFilterCondition, unAuthorizedCommentTypes[i].kli_commenttype, unAuthorizedCommentTypes[i].kli_regardingobjecttype.Value);
                            fexp.AddCondition(new ConditionExpression("kli_commenttype", ConditionOperator.NotIn, Array.ConvertAll(unAuthorizedCommentTypes[i].kli_commenttype.Split(new char[] { ';' }, StringSplitOptions.RemoveEmptyEntries), int.Parse)));
                            fexp.AddCondition(new ConditionExpression("kli_regardingobjecttype", ConditionOperator.Equal, new object[] { unAuthorizedCommentTypes[i].kli_regardingobjecttype.Value  }));
                        }

                        //if(strConditions != string.Empty)
                        //    strFetchFilterConditions += string.Format(strFilter, strConditions);

                        if (fexp.Conditions.Count > 0)
                            FilterConditions.AddFilter(fexp);
                    }
                }
            }
            return FilterConditions;
        }        
    }
}
