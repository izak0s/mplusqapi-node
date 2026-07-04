# MplusKASSA API — method index

All 372 SOAP operations of the MplusKASSA API (`urn:mplusqapi`), as exposed by
[`@izak0s/mplusqapi-node`](https://www.npmjs.com/package/@izak0s/mplusqapi-node) as typed async
methods on `MplusKassaClient`. See the [README](README.md) for installation and usage.

Every method also accepts an optional trailing `requestId?: string` for debug tracing.
`Input<T>` relaxes a response type for use as request input (e.g. `Date` fields, plain arrays).

> Auto-generated from `src/generated/client.ts` by `npm run sync:readme` — do not edit manually.

| Method | Returns |
| --- | --- |
| `addProductsToArticleGroup(request: Input<AddProductsToArticleGroupRequest>)` | `AddProductsToArticleGroupResult` |
| `addToPurchaseBook(request: Input<AddToPurchaseBookRequest>)` | `AddToPurchaseBookResponse` |
| `addToTodoList(request: Input<AddToTodoListRequest>)` | `Struct2 \| undefined` |
| `adjustPoints(request: Input<AdjustPointsRequest>)` | `AdjustPointsResponse` |
| `assignButtonLayoutGroupToWorkplaces(request: Input<AssignButtonLayoutGroupToWorkplacesRequest>)` | `AssignButtonLayoutGroupToWorkplacesResponse` |
| `cancelExternalPayment(params: { terminal?: Input<Terminal>; request?: Input<CancelExternalPaymentRequest> })` | `CancelExternalPaymentResponse` |
| `cancelExternalPaymentV2(request: Input<ExternalPaymentWebhookRequest>)` | `ExternalPaymentWebhookResponse` |
| `cancelInterbranchOrder(request: Input<CancelInterbranchOrderRequest>)` | `CancelInterbranchOrderResponse` |
| `cancelOrder(params: { orderId?: string; request?: Input<CancelOrderRequest> })` | `CancelOrderResponse` |
| `cancelOrderV2(request: Input<CancelOrderV2Request>)` | `CancelOrderResponse` |
| `cancelPackingSlip(request: Input<CancelPackingSlipRequest>)` | `CancelPackingSlipResponse` |
| `cancelProposal(proposalId: string)` | `CancelProposalResponse` |
| `cancelTableOrder(params: { terminal?: Input<Terminal>; branchNumber?: number; tableNumber?: number })` | `CancelOrderResponse` |
| `cancelTableOrderV2(params: { terminal?: Input<Terminal>; request?: Input<CancelTableOrderRequest> })` | `CancelOrderResponse` |
| `changeTableProperty(request: Input<ChangeTablePropertyReq>)` | `ChangeTablePropertyResp` |
| `checkGiftcardPayment(request: Input<CheckGiftcardPaymentRequest>)` | `CheckGiftcardPaymentResponse` |
| `claimInterbranchOrder(request: Input<ClaimInterbranchOrderRequest>)` | `ClaimInterbranchOrderResponse` |
| `createActivity(request: Input<CreateActivityRequest>)` | `CreateActivityResponse` |
| `createAndPayTableOrder(request?: Input<CreateAndPayTableOrderRequest>)` | `CreateAndPayTableOrderResponse` |
| `createDeliveryMethod(request: Input<CreateDeliveryMethodRequest>)` | `CreateDeliveryMethodResponse` |
| `createEmployee(employee?: Input<Employee>)` | `CreateEmployeeResponse` |
| `createGiftcard(request: Input<CreateGiftcardRequest>)` | `CreateGiftcardResponse` |
| `createImage(request: Input<CreateImageRequest>)` | `CreateImageResponse` |
| `createImageFromUrl(request: Input<CreateImageFromUrlRequest>)` | `CreateImageResponse` |
| `createInterbranchDelivery(request: Input<CreateInterbranchDeliveryRequest>)` | `CreateInterbranchDeliveryResponse` |
| `createInterbranchOrder(request: Input<CreateInterbranchOrderRequest>)` | `CreateInterbranchOrderResponse` |
| `createInterbranchShipment(request: Input<CreateInterbranchShipmentRequest>)` | `CreateInterbranchShipmentResponse` |
| `createInvoiceFromPackingSlips(request: Input<CreateInvoiceFromPackingSlipsRequest>)` | `CreateInvoiceFromPackingSlipsResponse` |
| `createInvoiceFromProposal(proposalId: string)` | `CreateInvoiceFromProposalResponse` |
| `createInvoiceReminders(request: Input<CreateInvoiceRemindersRequest>)` | `CreateInvoiceRemindersResponse` |
| `createOrder(order?: Input<Order>)` | `CreateOrderResponse` |
| `createOrderFromProposal(proposalId: string)` | `CreateOrderFromProposalResponse` |
| `createOrderV2(request: Input<CreateOrderV2Request>)` | `CreateOrderV2Response` |
| `createOrderV3(request: Input<CreateOrderV3Request>)` | `CreateOrderV3Response` |
| `createProduct(product: Input<Product>)` | `CreateProductResponse` |
| `createRelation(relation?: Input<Relation>)` | `CreateRelationResponse` |
| `createSalesObjectsBySalesRepeatTemplate(request: Input<CreateSalesObjectsBySalesRepeatTemplateRequest>)` | `GeneratedSalesObject[]` |
| `createTodoList(request: Input<CreateTodoListRequest>)` | `number` |
| `creditInvoice(invoiceId: string)` | `CreditInvoiceResponse` |
| `creditInvoiceV2(request: Input<CreditInvoiceV2Request>)` | `CreditInvoiceV2Result \| undefined` |
| `deleteActivity(request: Input<DeleteActivityRequest>)` | `DeleteActivityResponse` |
| `deleteArticleAlterationsGroup(request: Input<DeleteArticleAlterationsGroupRequest>)` | `DeleteArticleAlterationsGroupResult` |
| `deleteArticleGroup(request: Input<DeleteArticleGroupRequest>)` | `DeleteArticleGroupResult` |
| `deleteArticleVariants(request: Input<DeleteArticleVariantsRequest>)` | `DeleteArticleVariantsResult` |
| `deleteAuthorizationGroup(request: Input<DeleteAuthorizationGroupRequest>)` | `DeleteAuthorizationGroupResponse` |
| `deleteButtonLayoutGroup(request: Input<DeleteButtonLayoutGroupRequest>)` | `DeleteButtonLayoutGroupResponse` |
| `deletePreparationMethodGroup(request: Input<DeletePreparationMethodGroupRequest>)` | `DeletePreparationMethodGroupResponse` |
| `deleteProductsFromArticleGroup(request: Input<DeleteProductsFromArticleGroupRequest>)` | `DeleteProductsFromArticleGroupResult` |
| `deliverInterbranchShipment(request: Input<DeliverInterbranchShipmentRequest>)` | `DeliverInterbranchShipmentResponse` |
| `deliverOrder(request: Input<DeliverOrderRequest>)` | `DeliverOrderResponse` |
| `deliverOrderV2(request: Input<DeliverOrderV2Request>)` | `DeliverOrderV2Response` |
| `determineContractLines(request: Input<DetermineContractLinesRequest>)` | `Line[]` |
| `determinePricing(request: Input<DeterminePricingRequest>)` | `DeterminePricingResponse` |
| `EidSearch(request: Input<EidSearchRequest>)` | `EidSearchResponse` |
| `encryptString(request: Input<EncryptStringRequest>)` | `string` |
| `findEmployee(employee?: Input<Employee>)` | `FindEmployeeResponse` |
| `findInvoice(extInvoiceId: string)` | `GetInvoiceResponse` |
| `findOrder(extOrderId: string)` | `GetOrderResponse` |
| `findRelation(relation?: Input<Relation>)` | `FindRelationResponse` |
| `findRelationV2(request: Input<FindRelationV2Request>)` | `FindRelationV2Response` |
| `findTableOrder(params: { terminal?: Input<Terminal>; extOrderId?: string })` | `GetTableOrderResponse` |
| `getActiveCycleCount(request: Input<GetActiveCycleCountRequest>)` | `GetActiveCycleCountResponse` |
| `getActiveEmployeeList(terminal: Input<Terminal>)` | `EmployeeName[] \| undefined` |
| `getActivities(request: Input<GetActivitiesRequest>)` | `Activity[]` |
| `getActivityTypes(request: Input<GetActivityTypesRequest>)` | `ActivityType[]` |
| `getApiVersion()` | `getApiVersionResponse` |
| `getAppConfiguration(request: Input<GetAppConfigurationRequest>)` | `string` |
| `getArticleAlterationsGroups(request: Input<GetArticleAlterationsGroupsRequest>)` | `ArticleAlterationsGroup[]` |
| `getArticleBranchDeviations(request: Input<GetArticleBranchDeviationsRequest>)` | `ArticleBranchDeviationLine[] \| undefined` |
| `getArticleCardLayout(request: Input<GetArticleCardLayoutRequest>)` | `CardLayoutField[]` |
| `getArticleComponents(request: Input<GetArticleComponentsRequest>)` | `ArticleComponent[]` |
| `getArticleDynamicMinMaxStock(request: Input<GetArticleDynamicMinMaxStockRequest>)` | `ArticleDynamicMinMaxStock[]` |
| `getArticleGroupChanges(request: Input<GetArticleGroupChangesRequest>)` | `ChangedArticleGroup[]` |
| `getArticleGroups(request: Input<GetArticleGroupsRequest>)` | `ArticleGroup[]` |
| `getArticlesInLayout(terminal: Input<Terminal>)` | `ArticleSimple[] \| undefined` |
| `getArticlesNutritionalCharacteristics(request: Input<GetArticlesNutritionalCharacteristicsRequest>)` | `GetArticlesNutritionalCharacteristicsResponse` |
| `getArticlesPreparationMethodGroups(request: Input<GetArticlesPreparationMethodGroupsRequest>)` | `GetArticlesPreparationMethodGroupsResponse` |
| `getArticlesVariants(request: Input<GetArticlesVariantsRequest>)` | `GetArticlesVariantsResponse` |
| `getArticleVariants(request: Input<GetArticleVariantsRequest>)` | `GetArticleVariantsResponse` |
| `getAuthorizationGroups(request: Input<GetAuthorizationGroupsRequest>)` | `AuthorizationGroup[]` |
| `getAuthorizationTree(request: Input<GetAuthorizationTreeRequest>)` | `GetAuthorizationTreeResponse` |
| `getAvailablePaymentMethods(terminal?: Input<Terminal>)` | `PaymentMethod[]` |
| `getAvailablePaymentMethodsV2(request: Input<GetAvailablePaymentMethodsV2Request>)` | `PaymentMethod[]` |
| `getAvailableTerminalList()` | `Terminal[] \| undefined` |
| `getBpeBudgets(request: Input<GetBpeBudgetsRequest>)` | `BpeEmployeeBudget[]` |
| `getBranches()` | `Branch[]` |
| `getBranchGroups(request: Input<GetBranchGroupsRequest>)` | `BranchGroups[]` |
| `getBranchInformation(request: Input<GetBranchInformationRequest>)` | `GetBranchInformationResponse` |
| `getButtonLayout(terminal: Input<Terminal>)` | `ButtonLayout \| undefined` |
| `getButtonLayoutGroupDetails(request: Input<GetButtonLayoutGroupDetailsRequest>)` | `GetButtonLayoutGroupDetailsResponse` |
| `getButtonLayoutGroupForBranch(request: Input<ButtonLayoutGroupForBranchRequest>)` | `ButtonLayoutGroupForBranchResponse` |
| `getButtonLayoutGroupsWithAssignedWorkplaces(request: Input<GetButtonLayoutGroupsWithAssignedWorkplacesRequest>)` | `ButtonLayoutGroupsWithAssignedWorkplaces[] \| undefined` |
| `getCardCategories()` | `GetCardCategoriesResponse` |
| `getCardCategoriesV2(request: Input<GetCardCategoriesV2Request>)` | `GetCardCategoriesV2Response` |
| `getCardFilterOptions(request: Input<GetCardFilterOptionsRequest>)` | `GetCardFilterOptionsResponse` |
| `getCardImageLabels(request: Input<GetCardImageLabelsRequest>)` | `ImageLabel[] \| undefined` |
| `getCardImages(request: Input<GetCardImagesRequest>)` | `CardImageData[] \| undefined` |
| `getCashCountInfo(request: Input<GetCashCountInfoRequest>)` | `CashCountInfo \| undefined` |
| `getCashCountList(request: Input<GetCashCountListRequest>)` | `CashCount[]` |
| `getCashDrawerBalancingList(request: Input<GetCashDrawerBalancingListRequest>)` | `CashDrawerBalancing[]` |
| `getConfiguration(request: Input<GetConfigurationRequest>)` | `Configuration[]` |
| `getConfigurationTree(request: Input<GetConfigurationTreeRequest>)` | `ConfigurationGroup[] \| undefined` |
| `getConfigurationValues(request: Input<GetConfigurationValuesRequest>)` | `ConfigurationKeyValues[] \| undefined` |
| `getCostCenters(request: Input<GetCostCentersRequest>)` | `CostCenter[]` |
| `getCourseList(terminal: Input<Terminal>)` | `Course[] \| undefined` |
| `getCourseListV2(request: Input<GetCourseListV2Request>)` | `CourseInfo[] \| undefined` |
| `getCurrentSyncMarkers()` | `getCurrentSyncMarkersResponse` |
| `getCurrentSyncMarkersV2(request: Input<GetCurrentSyncMarkersV2Request>)` | `GetCurrentSyncMarkersV2Response` |
| `getCurrentTableOrders(request: Input<GetCurrentTableOrdersRequest>)` | `Order[]` |
| `getCustomFieldLists()` | `GetCustomFieldListsResponse` |
| `getDatabaseVersion()` | `getDatabaseVersionResponse` |
| `getDayStockConfiguration(request: Input<GetDayStockConfigurationRequest>)` | `DayStockConfiguration[]` |
| `getDeliveryMethods()` | `DeliveryMethod[]` |
| `getDeliveryMethodsV2(request: Input<GetDeliveryMethodsV2Request>)` | `DeliveryMethod[]` |
| `getEmailTemplates(request: Input<GetEmailTemplatesRequest>)` | `EmailTemplate[]` |
| `getEmployee(employeeNumber: number)` | `GetEmployeeResponse` |
| `getEmployeeAuthorizationGroups(request: Input<GetEmployeeAuthorizationGroupsRequest>)` | `GetEmployeeAuthorizationGroupsResponse` |
| `getEmployeeAuthorizations(request: Input<GetEmployeeAuthorizationsRequest>)` | `EmployeeAuthorization[]` |
| `getEmployeeAuthorizationSyncMarkers(request: Input<GetEmployeeAuthorizationSyncMarkersRequest>)` | `GetEmployeeAuthorizationSyncMarkersResponse` |
| `getEmployeeBranchAuthorizations(request: Input<GetEmployeeBranchAuthorizationsRequest>)` | `EmployeeBranchAuthorization[]` |
| `getEmployees(request?: Input<getEmployeesRequest>)` | `Employee[]` |
| `getEmployeeWorkplaceLoginStates(request: Input<GetEmployeeWorkplaceLoginStatesRequest>)` | `WorkplaceLoginStateInfo[] \| undefined` |
| `getFilterProfiles(request: Input<GetFilterProfilesRequest>)` | `FilterProfile[] \| undefined` |
| `getFinancialJournal(request: Input<GetFinancialJournalRequest>)` | `GetFinancialJournalResponse` |
| `getFinancialJournalByCashCount(request: Input<GetFinancialJournalByCashCountRequest>)` | `GetFinancialJournalResponse` |
| `getFloorplans(request: Input<GetFloorplansRequest>)` | `Floorplan[]` |
| `getGiftcard(request: Input<GetGiftcardRequest>)` | `GetGiftcardResponse` |
| `getGiftcardHistory(request: Input<GetGiftcardHistoryRequest>)` | `GetGiftcardHistoryResponse` |
| `getGiftcards(request: Input<GetGiftcardsRequest>)` | `GetGiftcard[]` |
| `getGiftcardTypes(request: Input<GetGiftcardTypesRequest>)` | `GiftcardType[]` |
| `getGksInformation(request: Input<GetGksInformationRequest>)` | `string` |
| `getGroupAuthorizations(request: Input<GetGroupAuthorizationsRequest>)` | `GroupAuthorization[]` |
| `getImages(request?: Input<GetImagesRequest>)` | `Image[]` |
| `getInterbranchDeliveries(request: Input<GetInterbranchDeliveriesRequest>)` | `InterbranchDelivery[]` |
| `getInterbranchOrders(request: Input<GetInterbranchOrdersRequest>)` | `InterbranchOrder[]` |
| `getInterbranchShipments(request: Input<GetInterbranchShipmentsRequest>)` | `InterbranchShipment[]` |
| `getInvoice(invoiceId: string)` | `GetInvoiceResponse` |
| `getInvoices(request: Input<GetInvoicesRequest>)` | `Invoice[]` |
| `getJournals(request: Input<GetJournalsRequest>)` | `Journal[]` |
| `getKitchenTickets(request: Input<GetKitchenTicketsRequest>)` | `GetKitchenTicketsResponse` |
| `getLicenseInformation()` | `GetLicenseInformationResponse` |
| `getMainTableList(request: Input<getMainTableListRequest>)` | `MainTable[] \| undefined` |
| `getMaxTableNumber(terminal: Input<Terminal>)` | `number` |
| `getMealplanMomentsConfiguration(request: Input<GetMealplanMomentsConfigurationRequest>)` | `MealmomentConfiguration[] \| undefined` |
| `getMessages(request: Input<GetMessagesRequest>)` | `Message[]` |
| `getNutrientTypes(request: Input<GetNutrientTypesRequest>)` | `nsNutrientType[] \| undefined` |
| `getNutritionalCharacteristics(request: Input<GetNutritionalCharacteristicsRequest>)` | `GetNutritionalCharacteristicsResponse` |
| `getOrder(orderId: string)` | `GetOrderResponse` |
| `getOrderCategories()` | `OrderCategory[] \| undefined` |
| `getOrderChanges(request: Input<GetOrderChangesRequest>)` | `OrderChange[]` |
| `getOrderHistory(request: Input<GetOrderHistoryRequest>)` | `OrderHistoryOrderDetailsList \| undefined` |
| `getOrders(request: Input<GetOrdersRequest>)` | `Order[]` |
| `getOrdersByExtOrderIds(request: Input<GetOrdersByExtOrderIdsRequest>)` | `Order[]` |
| `getOrdersByReceipts(request: Input<GetOrdersByReceiptsRequest>)` | `Order[]` |
| `getOverview(request: Input<OverviewRequest>)` | `OverviewResponse` |
| `getOverviewFields(request: Input<GetOverviewFieldsRequest>)` | `GetOverviewFieldsResponse` |
| `getOwnerLabels(request: Input<GetOwnerLabelsRequest>)` | `OwnerLabel[] \| undefined` |
| `getPackingSlipQueue(request: Input<GetPackingSlipQueueRequest>)` | `GetPackingSlipQueueResponse` |
| `getPackingSlips(request: Input<GetPackingSlipsRequest>)` | `PackingSlip[]` |
| `getPackingSlipsByOrder(request: Input<GetPackingSlipsByOrderRequest>)` | `PackingSlip[]` |
| `getPasswordRequirements(request: Input<PasswordRequirementsRequest>)` | `PasswordRequirementsResponse` |
| `getPaymentMethods()` | `PaymentMethod[]` |
| `getPaymentMethodsV2(request: Input<GetPaymentMethodsRequest>)` | `PaymentMethod[]` |
| `getPlannedCycleCounts(request: Input<GetPlannedCycleCountsRequest>)` | `PlannedCycleCount[]` |
| `getPreparationMethodGroups(request: Input<GetPreparationMethodGroupsRequest>)` | `GetPreparationMethodGroupsResponse` |
| `getPriceGroupList()` | `PriceGroup[] \| undefined` |
| `getPrintLayoutAssignments(request: Input<GetPrintLayoutAssignmentsRequest>)` | `PrintLayoutAssignment[] \| undefined` |
| `getPrintLayoutMarkup(request: Input<GetPrintLayoutMarkupRequest>)` | `GetPrintLayoutMarkupResponse` |
| `getPrintLayouts(request: Input<GetPrintLayoutsRequest>)` | `GetPrintLayoutsResponse` |
| `getProducts(request: Input<GetProductsRequest>)` | `Product[]` |
| `getProposal(proposalId: string)` | `GetProposalResponse` |
| `getProposals(request: Input<GetProposalsRequest>)` | `Proposal[]` |
| `getPurchaseBook(request: Input<GetPurchaseBookRequest>)` | `GetPurchaseBookResponse` |
| `getPurchaseDeliveries(request: Input<GetPurchaseDeliveriesRequest>)` | `PurchaseDelivery[]` |
| `getPurchaseDeliveriesV2(request: Input<GetPurchaseDeliveriesV2Request>)` | `PurchaseDeliveryV2[]` |
| `getPurchaseOrders(request: Input<GetPurchaseOrdersRequest>)` | `PurchaseOrder[]` |
| `getPurchaseOrdersV2(request: Input<GetPurchaseOrdersV2Request>)` | `PurchaseOrderV2[]` |
| `getQueueBranchOrderPaymentStatus(queuedPaymentId: string)` | `GetQueueBranchOrderPaymentStatusResponse` |
| `getReceipt(receiptId: string)` | `GetReceiptResponse` |
| `getReceipts(request: Input<GetReceiptsRequest>)` | `Receipt[]` |
| `getReceiptsByCashCount(request: Input<GetReceiptsByCashCountRequest>)` | `GetReceiptsByCashCountResponse` |
| `getReceiptsByOrder(orderId: string)` | `GetReceiptsByOrderResponse` |
| `getRedeemableVoucherIssuances(request: Input<GetRedeemableVoucherIssuancesRequest>)` | `RedeemableVoucherIssuance[]` |
| `getRelation(relationNumber: number)` | `GetRelationResponse` |
| `getRelationGiftcards(request: Input<GetRelationGiftcardsRequest>)` | `RelationGiftcard[]` |
| `getRelationPoints(request: Input<GetRelationPointsRequest>)` | `GetRelationPoints[] \| undefined` |
| `getRelationPresence(request: Input<GetRelationPresenceRequest>)` | `GetRelationPresenceResponse` |
| `getRelations(request?: Input<GetRelationsRequest>)` | `Relation[]` |
| `getRenderedPrintLayout(request: Input<GetRenderedPrintLayoutRequest>)` | `GetRenderedPrintLayoutResponse` |
| `getResolvedPrintTemplates(request: Input<GetResolvedPrintTemplatesRequest>)` | `GetResolvedPrintTemplatesResponse` |
| `getRetailSpaceRental(request: Input<GetRetailSpaceRentalRequest>)` | `GetRetailSpaceRentalResponse` |
| `getRetailSpaceRentals(request: Input<GetRetailSpaceRentalsRequest>)` | `RetailSpaceRental[]` |
| `getSalePromotions(request: Input<GetSalePromotionsRequest>)` | `SalePromotions[]` |
| `getSalesObjectsBySalesRepeatTemplates(request: Input<GetSalesObjectsBySalesRepeatTemplatesRequest>)` | `RepeatTemplateSalesObject[]` |
| `getSalesPriceList()` | `SalesPrice[] \| undefined` |
| `getSalesRepeatTemplates(request: Input<GetSalesRepeatTemplatesRequest>)` | `SalesRepeatTemplate[]` |
| `getScheduledMealPlans(request: Input<GetScheduledMealPlansRequest>)` | `GetScheduledMealPlansResponse` |
| `getShifts(request: Input<GetShiftsRequest>)` | `Shift[]` |
| `getSpecialBarcodePatterns(request: Input<GetSpecialBarcodePatternsRequest>)` | `BarcodePattern[] \| undefined` |
| `getStock(request: Input<GetStockRequest>)` | `ArticleStock[] \| undefined` |
| `getStockCorrections(request: Input<GetStockCorrectionsRequest>)` | `StockCorrectionV2[]` |
| `getStockHistory(request: Input<GetStockHistoryRequest>)` | `ArticleStockHistory[] \| undefined` |
| `getStockHistoryV2(request: Input<GetStockHistoryV2Request>)` | `ArticleStockHistory[] \| undefined` |
| `getSubTableList(request: Input<getSubTableListRequest>)` | `SubTableState[] \| undefined` |
| `getTableList(terminal: Input<Terminal>)` | `Table[] \| undefined` |
| `getTableListV2(terminal: Input<Terminal>)` | `WholeTable[] \| undefined` |
| `getTableListV3(request: Input<getTableListV3Request>)` | `WholeTable[] \| undefined` |
| `getTableOrder(params: { terminal?: Input<Terminal>; branchNumber?: number; tableNumber?: number })` | `GetTableOrderResponse` |
| `getTableOrderCourseList(params: { terminal?: Input<Terminal>; branchNumber?: number; tableNumber?: number })` | `GetTableOrderCourseListResponse` |
| `getTableOrderCourseListV2(params: { terminal?: Input<Terminal>; request?: Input<GetTableOrderCourseListRequest> })` | `GetTableOrderCourseListResponse` |
| `getTableOrderCourseListV3(request: Input<GetTableOrderCourseListRequest>)` | `GetTableOrderCourseListResponse` |
| `getTableOrderV2(params: { terminal?: Input<Terminal>; request?: Input<GetTableOrderRequest> })` | `GetTableOrderResponse` |
| `getTableOrderV3(request: Input<GetTableOrderV3Request>)` | `GetTableOrderResponse` |
| `getTapTickHistory(request: Input<TapTickHistoryRequest>)` | `TapTickHistory[] \| undefined` |
| `getTapTickTotals(request: Input<TapTickTotalsRequest>)` | `BranchTapTickTotals[] \| undefined` |
| `getTerminalSettings(terminal?: Input<Terminal>)` | `GetTerminalSettingsResponse` |
| `getTicketCounterSales(request: Input<GetTicketCounterSalesRequest>)` | `TicketCounterSale[]` |
| `getTimelineEvents(request: Input<GetTimelineEventsRequest>)` | `TimelineEvent[]` |
| `getTodoList(id: number)` | `TodoList` |
| `getTodoLists(request: Input<GetTodoListsRequest>)` | `TodoList[] \| undefined` |
| `getTurnoverGroups(request: Input<GetTurnoverGroupsRequest>)` | `TurnoverGroup[]` |
| `getVatGroupList()` | `VatGroup[] \| undefined` |
| `getVoucher(request: Input<GetVoucherRequest>)` | `Voucher \| undefined` |
| `getVoucherCategories(request: Input<GetVoucherCategoriesRequest>)` | `VoucherCategory[]` |
| `getVoucherExternalScanCodes(request: Input<GetVoucherExternalScanCodesRequest>)` | `VoucherExternalScanCode[]` |
| `getVoucherIssuances(request: Input<GetVoucherIssuancesRequest>)` | `VoucherIssuance[]` |
| `getVouchers(request: Input<GetVouchersRequest>)` | `VoucherView[]` |
| `getVoucherSettings(request: Input<GetVoucherSettingsRequest>)` | `VoucherSettingsV1[]` |
| `getWebhookConsumers(request: Input<GetWebhookConsumersRequest>)` | `WebhookConsumer[]` |
| `getWordAliases(request: Input<GetWordAliasesRequest>)` | `WordAlias[]` |
| `issueVoucherExternalScanCodes(request: Input<IssueVoucherExternalScanCodesRequest>)` | `IssueVoucherExternalScanCodesResponse` |
| `issueVouchers(request: Input<IssueVouchersRequest>)` | `IssueVouchersResponse` |
| `linkGiftcardsToRelation(request: Input<LinkGiftcardsToRelationRequest>)` | `LinkGiftcardsToRelationResponse` |
| `logMistake(params: { terminal?: Input<Terminal>; request?: Input<LogMistakeRequest> })` | `LogMistakeResult` |
| `moveTableOrder(params: { terminal?: Input<Terminal>; order?: Input<Order>; tableNumber?: number })` | `MoveTableOrderResponse` |
| `moveTableOrderV2(params: { terminal?: Input<Terminal>; request?: Input<MoveTableOrderRequest> })` | `MoveTableOrderResponse` |
| `moveTableOrderV3(request: Input<MoveTableOrderV3Request>)` | `MoveTableOrderV3Response` |
| `newArticleGroup(request: Input<NewArticleGroupRequest>)` | `NewArticleGroupResponse` |
| `newArticleVariant(request: Input<NewArticleVariantRequest>)` | `NewArticleVariantResponse` |
| `parseSpecialBarcode(request: Input<ParseSpecialBarcodeRequest>)` | `ParseSpecialBarcodeResponse` |
| `passwordReset(request: Input<PasswordResetRequest>)` | `PasswordResetResponse` |
| `pauseSalesRepeatTemplates(request: Input<PauseSalesRepeatTemplatesRequest>)` | `PauseSalesRepeatTemplatesResponse` |
| `payInvoice(request: Input<PayInvoiceRequest>)` | `PayInvoiceResponse` |
| `payOrder(request: Input<PayOrderRequest>)` | `PayOrderResponse` |
| `payOrderV2(request: Input<PayOrderV2Request>)` | `PayOrderV2Response` |
| `payTableOrder(params: { terminal?: Input<Terminal>; order?: Input<Order>; paymentList?: Input<Payment>[] })` | `PayTableOrderResponse` |
| `payTableOrderV2(params: { terminal?: Input<Terminal>; request?: Input<PayTableOrderRequest> })` | `PayTableOrderResponse` |
| `performBpeBudgetChecks(request: Input<PerformBpeBudgetChecksRequest>)` | `PerformBpeBudgetChecksResponse` |
| `placeTableOrder(request: Input<PlaceTableOrderReq>)` | `PlaceTableOrderResp` |
| `pollExternalPayment(params: { terminal?: Input<Terminal>; request?: Input<PollExternalPaymentRequest> })` | `PollExternalPaymentResponse` |
| `pollExternalPaymentV2(request: Input<ExternalPaymentWebhookRequest>)` | `ExternalPaymentWebhookResponse` |
| `prepayTableOrder(params: { terminal?: Input<Terminal>; order?: Input<Order>; paymentList?: Input<Payment>[]; prepayAmount?: number })` | `PrepayTableOrderResponse` |
| `prepayTableOrderV2(params: { terminal?: Input<Terminal>; request?: Input<PrepayTableOrderRequest> })` | `PrepayTableOrderResponse` |
| `print(request: Input<PrintRequest>)` | `PrintResponse` |
| `printPrintLayout(request: Input<PrintPrintLayoutRequest>)` | `PrintPrintLayoutResponse` |
| `printReceipt(terminal: Input<Terminal>)` | `PrintReceiptResponse` |
| `printReceiptV2(request: Input<PrintReceiptV2Request>)` | `PrintReceiptV2Response` |
| `printTableReceipt(params: { terminal?: Input<Terminal>; tableNumber?: number })` | `PrintTableReceiptResponse` |
| `printTableReceiptV2(params: { terminal?: Input<Terminal>; request?: Input<PrintTableReceiptRequest> })` | `PrintTableReceiptResponse` |
| `printTableReceiptV3(request: Input<PrintTableReceiptV3Request>)` | `PrintTableReceiptV3Response` |
| `processInvoice(request: Input<ProcessInvoiceRequest>)` | `ProcessInvoiceResponse` |
| `processOrder(request: Input<ProcessOrderRequest>)` | `ProcessOrderResponse` |
| `processPackingSlip(request: Input<ProcessPackingSlipRequest>)` | `ProcessPackingSlipResponse` |
| `processProposal(request: Input<ProcessProposalRequest>)` | `ProcessProposalResponse` |
| `queueBranchOrder(order?: Input<Order>)` | `QueueBranchOrderResponse` |
| `queueBranchOrderPayment(paymentRequest?: Input<QueueBranchOrderPaymentRequest>)` | `QueueBranchOrderPaymentResponse` |
| `redeemVoucherIssuance(request: Input<RedeemVoucherIssuanceRequest>)` | `RedeemVoucherIssuanceResponse` |
| `registerGiftcardPayment(request: Input<RegisterGiftcardPaymentRequest>)` | `RegisterGiftcardPaymentResponse` |
| `registerGiftcardPaymentV2(request: Input<RegisterGiftcardPaymentV2Request>)` | `RegisterGiftcardPaymentV2Response` |
| `registerTerminal(params: { terminal?: Input<Terminal>; forceRegistration?: boolean })` | `RegisterTerminalResponse` |
| `registerTimelineEvents(request: Input<RegisterTimelineEventsRequest>)` | `RegisterTimelineEventsResponse` |
| `releaseInterbranchOrder(request: Input<ReleaseInterbranchOrderRequest>)` | `ReleaseInterbranchOrderResponse` |
| `releaseTable(params: { terminal?: Input<Terminal>; request?: Input<ReleaseTableRequest> })` | `ReleaseTableOrderResult` |
| `releaseTableV2(request: Input<ReleaseTableV2Request>)` | `ReleaseTableV2Result` |
| `reloadGiftcard(request: Input<ReloadGiftcardRequest>)` | `ReloadGiftcardResponse` |
| `removeTodoList(id: number)` | `Struct3 \| undefined` |
| `replaceProductsOfArticleGroup(request: Input<ReplaceProductsOfArticleGroupRequest>)` | `ReplaceProductsOfArticleGroupResult` |
| `reportArticlePerformance(request: Input<ReportArticlePerformanceRequest>)` | `ReportArticlePerformance[]` |
| `reportAverageSpending(request: Input<ReportAverageSpendingRequest>)` | `ReportAverageSpending[]` |
| `reportBPE(request: Input<ReportBPERequest>)` | `ReportBPE[]` |
| `reportBranchPerformance(request: Input<ReportBranchPerformanceRequest>)` | `ReportBranchPerformance[]` |
| `reportCancellations(request: Input<ReportCancellationsRequest>)` | `ReportCancellations[]` |
| `reportHoursByEmployee(request: Input<ReportHoursByEmployeeRequest>)` | `ReportHoursByEmployee[]` |
| `reportPaymentMethodDetails(request: Input<ReportPaymentMethodDetailsRequest>)` | `ReportPaymentSource[] \| undefined` |
| `reportPaymentMethods(request: Input<ReportPaymentMethodsRequest>)` | `ReportPaymentMethods[]` |
| `reportPrintableFinancialTotals(request: Input<ReportPrintableFinancialTotalsRequest>)` | `ReportPrintableFinancialTotalsLine[]` |
| `reportTables(request: Input<ReportTablesRequest>)` | `ReportTables[]` |
| `reportTurnover(request: Input<ReportTurnoverRequest>)` | `ReportTurnover[]` |
| `reportTurnoverByActivity(request: Input<ReportTurnoverByActivityRequest>)` | `ReportTurnoverByActivity[]` |
| `reportTurnoverByArticle(request: Input<ReportTurnoverByArticleRequest>)` | `ReportTurnoverByArticle[]` |
| `reportTurnoverByBranch(request: Input<ReportTurnoverByBranchRequest>)` | `ReportTurnoverByBranch[]` |
| `reportTurnoverByEmployee(request: Input<ReportTurnoverByEmployeeRequest>)` | `ReportTurnoverByEmployee[]` |
| `reportTurnoverByTurnoverGroup(request: Input<ReportTurnoverByTurnoverGroupRequest>)` | `ReportTurnoverByTurnoverGroup[]` |
| `requestCancelExternalPayment(params: { terminal?: Input<Terminal>; request?: Input<RequestCancelExternalPaymentRequest> })` | `RequestCancelExternalPaymentResponse` |
| `requestCancelExternalPaymentV2(request: Input<ExternalPaymentWebhookRequest>)` | `ExternalPaymentWebhookResponse` |
| `requestNextTableOrderCourseV2(params: { terminal?: Input<Terminal>; request?: Input<RequestNextTableOrderCourseRequest> })` | `RequestTableOrderCourseResponse` |
| `requestNextTableOrderCourseV3(request: Input<RequestNextTableOrderCourseV3Request>)` | `RequestTableOrderCourseResponse` |
| `requestTableOrderCourse(params: { terminal?: Input<Terminal>; branchNumber?: number; tableNumber?: number; employeeNumber?: number; courseNumber?: number })` | `RequestTableOrderCourseResponse` |
| `restartSalesRepeatTemplates(request: Input<RestartSalesRepeatTemplatesRequest>)` | `RestartSalesRepeatTemplatesResponse` |
| `restituteGiftcards(request: Input<RestituteGiftcardsRequest>)` | `RestituteGiftcardsResponse` |
| `runInterbranchPlanner(request: Input<RunInterbranchPlannerRequest>)` | `RunInterbranchPlannerResponse` |
| `saveActivity(request: Input<SaveActivityRequest>)` | `SaveActivityResponse` |
| `saveActivityTypes(request: Input<SaveActivityTypesRequest>)` | `SaveActivityTypesResult` |
| `saveArticleAlterationsGroup(request: Input<SaveArticleAlterationsGroupRequest>)` | `SaveArticleAlterationsGroupResponse` |
| `saveArticleBranchDeviations(request: Input<SaveArticleBranchDeviationsRequest>)` | `SaveArticleBranchDeviationsResponse` |
| `saveArticleComponents(request: Input<SaveArticleComponentsRequest>)` | `SaveArticleComponentsResponse` |
| `saveAuthorizationGroup(request: Input<SaveAuthorizationGroupRequest>)` | `SaveAuthorizationGroupResponse` |
| `saveBpeBudgets(request: Input<SaveBpeBudgetsRequest>)` | `SaveBpeBudgetsResponse` |
| `saveButtonLayoutGroupDetails(request: Input<SaveButtonLayoutGroupDetailsRequest>)` | `SaveButtonLayoutGroupDetailsResponse` |
| `saveCardImages(request: Input<SaveCardImagesRequest>)` | `SaveCardImagesResponse` |
| `saveCashCount(request: Input<SaveCashCountRequest>)` | `SaveCashCountResponse` |
| `saveCostCenters(request: Input<SaveCostCentersRequest>)` | `SaveCostCentersResponse` |
| `saveCredentials(request: Input<SaveCredentialsRequest>)` | `SaveCredentialsResult` |
| `saveDayStockConfiguration(request: Input<SaveDayStockConfigurationRequest>)` | `SaveDayStockConfigurationResult` |
| `saveGiftcards(request: Input<SaveGiftcardsRequest>)` | `SaveGiftcardsResponse` |
| `saveInvoice(invoice: Input<Invoice>)` | `SaveInvoiceResponse` |
| `saveOrder(order?: Input<Order>)` | `SaveOrderResponse` |
| `saveOwnerLabels(request: Input<SaveOwnerLabelsRequest>)` | `SaveOwnerLabelsResponse` |
| `savePreparationMethodGroup(request: Input<SavePreparationMethodGroupRequest>)` | `SavePreparationMethodGroupResponse` |
| `saveProposal(proposal: Input<Proposal>)` | `SaveProposalResponse` |
| `savePurchaseBook(request: Input<PurchaseBook>)` | `SavePurchaseBookResponse` |
| `savePurchaseDelivery(purchaseDelivery?: Input<PurchaseDelivery>)` | `SavePurchaseDeliveryResponse` |
| `savePurchaseDeliveryV2(request: Input<SavePurchaseDeliveryV2Request>)` | `SavePurchaseDeliveryV2Response` |
| `savePurchaseOrder(purchaseOrder?: Input<PurchaseOrder>)` | `SavePurchaseOrderResponse` |
| `savePurchaseOrderV2(request: Input<SavePurchaseOrderV2Request>)` | `SavePurchaseOrderV2Response` |
| `saveSalesRepeatTemplate(request: Input<SaveSalesRepeatTemplateRequest>)` | `SaveSalesRepeatTemplateResponse` |
| `saveStockCorrections(request: Input<SaveStockCorrectionsRequest>)` | `SaveStockCorrectionsResponse` |
| `saveTableOrder(params: { terminal?: Input<Terminal>; order?: Input<Order> })` | `SaveTableOrderResponse` |
| `saveTableOrderV2(params: { terminal?: Input<Terminal>; request?: Input<SaveTableOrderRequest> })` | `SaveTableOrderResponse` |
| `saveTodoList(request: Input<SaveTodoListRequest>)` | `Struct1 \| undefined` |
| `saveTodoListV2(request: Input<SaveTodoListV2Request>)` | `SaveTodoListV2Response` |
| `sendMessage(request: Input<SendMessageRequest>)` | `boolean` |
| `sendWebhook(request: Input<SendWebhookRequest>)` | `WebhookResp` |
| `setArticleRecalled(request: Input<SetArticleRecalledRequest>)` | `SetArticleRecalledResponse` |
| `setRelationPresence(request: Input<SetRelationPresenceRequest>)` | `SetRelationPresenceResponse` |
| `setStock(request: Input<SetStockRequest>)` | `SetStockResponse` |
| `setSubTableCount(params: { terminal?: Input<Terminal>; request?: Input<SetSubtableCountRequest> })` | `boolean` |
| `setWorkplaceActiveActivity(request: Input<SetWorkplaceActiveActivityRequest>)` | `SetWorkplaceActiveActivityResult` |
| `shipInterbranchOrder(request: Input<ShipInterbranchOrderRequest>)` | `ShipInterbranchOrderResponse` |
| `startExternalPayment(params: { terminal?: Input<Terminal>; request?: Input<StartExternalPaymentRequest> })` | `StartExternalPaymentResponse` |
| `startExternalPaymentV2(request: Input<ExternalPaymentWebhookRequest>)` | `ExternalPaymentWebhookResponse` |
| `stopSalesRepeatTemplates(request: Input<StopSalesRepeatTemplatesRequest>)` | `StopSalesRepeatTemplatesResponse` |
| `storeSinglyEftTransaction(params: { terminal?: Input<TerminalId>; eftTransaction?: Input<EftTransactionDetails> })` | `StoreSinglyEftTransactionResponse` |
| `updateActivity(request: Input<UpdateActivityRequest>)` | `UpdateActivityResponse` |
| `updateArticleCardLayout(request: Input<UpdateArticleCardLayoutRequest>)` | `UpdateArticleCardLayoutResponse` |
| `updateArticleContractLines(request: Input<UpdateArticleContractLinesRequest>)` | `UpdateArticleContractLinesResponse` |
| `updateArticleDynamicMinMaxStock(request: Input<UpdateArticleDynamicMinMaxStockRequest>)` | `ArticleDynamicMinMaxStock[]` |
| `updateArticleGroup(request: Input<UpdateArticleGroupRequest>)` | `UpdateArticleGroupResult` |
| `updateArticleMenu(request: Input<UpdateArticleMenuRequest>)` | `UpdateArticleMenuResponse` |
| `updateArticleNutrients(request: Input<UpdateArticleNutrientsRequest>)` | `UpdateArticleNutrientsResponse` |
| `updateArticleNutritionalCharacteristics(request: Input<UpdateArticleNutritionalCharacteristicsRequest>)` | `UpdateArticleNutritionalCharacteristicsResponse` |
| `updateArticlePreparationMethodGroups(request: Input<UpdateArticlePreparationMethodGroupsRequest>)` | `UpdateArticlePreparationMethodGroupsResponse` |
| `updateArticleVariant(request: Input<UpdateArticleVariantRequest>)` | `UpdateArticleVariantResponse` |
| `updateAttachedArticleAlterationsGroups(request: Input<UpdateAttachedArticleAlterationsGroupsRequest>)` | `UpdateAttachedArticleAlterationsGroupsResult` |
| `updateBatch(request: Input<UpdateBatchRequest>)` | `UpdateBatchResponse` |
| `updateConfiguration(request: Input<UpdateConfigurationRequest>)` | `UpdateConfigurationResult` |
| `updateConfigurationValues(request: Input<UpdateConfigurationValuesRequest>)` | `UpdateConfigurationValuesResponse` |
| `updateDeliveryMethod(request: Input<UpdateDeliveryMethodRequest>)` | `UpdateDeliveryMethodResponse` |
| `updateEmployee(employee?: Input<Employee>)` | `UpdateEmployeeResponse` |
| `updateEmployeeAuthorizationGroups(request: Input<UpdateEmployeeAuthorizationGroupsRequest>)` | `UpdateEmployeeAuthorizationGroupsResponse` |
| `updateGroupAuthorizations(request: Input<UpdateGroupAuthorizationsRequest>)` | `GroupAuthorization[]` |
| `updateInterbranchOrder(request: Input<UpdateInterbranchOrderRequest>)` | `UpdateInterbranchOrderResponse` |
| `updateNutritionalCharacteristics(request: Input<UpdateNutritionalCharacteristicsRequest>)` | `UpdateNutritionalCharacteristicsResponse` |
| `updateOnlineAuthorizationTree(request: Input<UpdateOnlineAuthorizationTreeRequest>)` | `UpdateOnlineAuthorizationTreeResponse` |
| `updateOrder(order?: Input<Order>)` | `UpdateOrderResponse` |
| `updateOrderV2(request: Input<UpdateOrderV2Request>)` | `UpdateOrderV2Response` |
| `updateProduct(product: Input<Product>)` | `UpdateProductResponse` |
| `updateRelation(relation?: Input<Relation>)` | `UpdateRelationResponse` |
| `updateStock(request: Input<UpdateStockRequest>)` | `UpdateStockResponse` |
| `updateTurnoverGroups(request: Input<UpdateTurnoverGroupsRequest>)` | `UpdateTurnoverGroupsResult` |
| `verifyCredentials(request: Input<VerifyCredentialsRequest>)` | `VerifyCredentialsResponse` |
| `verifyEmployeePassword(params: { terminal?: Input<Terminal>; employeeNumber?: number; password?: string })` | `boolean` |
