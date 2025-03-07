import React from "react";
import styled from "styled-components";
import { createNewApiName } from "utils/AppsmithUtils";
import { DATASOURCE_REST_API_FORM } from "constants/forms";
import FormTitle from "./FormTitle";
import Button from "components/editorComponents/Button";
import { Datasource } from "entities/Datasource";
import {
  getFormMeta,
  getFormValues,
  InjectedFormProps,
  reduxForm,
} from "redux-form";
import AnalyticsUtil from "utils/AnalyticsUtil";
import InputTextControl, {
  StyledInfo,
} from "components/formControls/InputTextControl";
import KeyValueInputControl from "components/formControls/KeyValueInputControl";
import DropDownControl from "components/formControls/DropDownControl";
import CenteredWrapper from "components/designSystems/appsmith/CenteredWrapper";
import { connect } from "react-redux";
import { AppState } from "reducers";
import { ApiActionConfig, PluginType } from "entities/Action";
import { ActionDataState } from "reducers/entityReducers/actionsReducer";
import { Toaster } from "components/ads/Toast";
import { Variant } from "components/ads/common";
import { DEFAULT_API_ACTION_CONFIG } from "constants/ApiEditorConstants";
import { createActionRequest } from "actions/pluginActionActions";
import {
  deleteDatasource,
  redirectAuthorizationCode,
  updateDatasource,
} from "actions/datasourceActions";
import { ReduxAction } from "constants/ReduxActionConstants";
import {
  datasourceToFormValues,
  formValuesToDatasource,
} from "transformers/RestAPIDatasourceFormTransformer";
import {
  ApiDatasourceForm,
  ApiKeyAuthType,
  AuthType,
  GrantType,
} from "entities/Datasource/RestAPIForm";
import {
  createMessage,
  REST_API_AUTHORIZATION_APPSMITH_ERROR,
  REST_API_AUTHORIZATION_FAILED,
  REST_API_AUTHORIZATION_SUCCESSFUL,
} from "constants/messages";
import Collapsible from "./Collapsible";
import _ from "lodash";
import FormLabel from "components/editorComponents/FormLabel";
import CopyToClipBoard from "components/designSystems/appsmith/CopyToClipBoard";
import { BaseButton } from "components/designSystems/appsmith/BaseButton";
import Callout from "components/ads/Callout";
import CloseEditor from "components/editorComponents/CloseEditor";
import { ButtonVariantTypes } from "components/constants";
import { updateReplayEntity } from "../../../actions/pageActions";
import { ENTITY_TYPE } from "entities/AppsmithConsole";

interface DatasourceRestApiEditorProps {
  initializeReplayEntity: (id: string, data: any) => void;
  updateDatasource: (
    formValues: Datasource,
    onSuccess?: ReduxAction<unknown>,
  ) => void;
  deleteDatasource: (id: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
  applicationId: string;
  datasourceId: string;
  pageId: string;
  isNewDatasource: boolean;
  pluginImage: string;
  location: {
    search: string;
  };
  datasource: Datasource;
  formData: ApiDatasourceForm;
  actions: ActionDataState;
  formMeta: any;
  messages?: Array<string>;
}

type Props = DatasourceRestApiEditorProps &
  InjectedFormProps<ApiDatasourceForm, DatasourceRestApiEditorProps>;

const RestApiForm = styled.div`
  flex: 1;
  padding: 20px;
  margin-left: 10px;
  margin-right: 0px;
  overflow: auto;
  .backBtn {
    padding-bottom: 1px;
    cursor: pointer;
  }
  .backBtnText {
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
  }
`;

const FormInputContainer = styled.div`
  margin-top: 16px;
`;

export const LoadingContainer = styled(CenteredWrapper)`
  height: 50%;
`;

const PluginImage = styled.img`
  height: 40px;
  width: auto;
`;

export const FormTitleContainer = styled.div`
  flex-direction: row;
  display: flex;
  align-items: center;
`;

export const Header = styled.div`
  flex-direction: row;
  display: flex;
  align-items: center;
  justify-content: space-between;
  //margin-top: 16px;
`;

const SaveButtonContainer = styled.div`
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
`;

const ActionButton = styled(BaseButton)`
  &&& {
    max-width: 72px;
    margin-right: 9px;
    min-height: 32px;
  }
`;

const StyledButton = styled(Button)`
  &&&& {
    width: 87px;
    height: 32px;
  }
`;

const AuthorizeButton = styled(StyledButton)`
  &&&& {
    width: 180px;
  }
`;

const COMMON_INPUT_PROPS: any = {
  name: "",
  formName: DATASOURCE_REST_API_FORM,
  id: "",
  isValid: false,
  controlType: "",
};

class DatasourceRestAPIEditor extends React.Component<Props> {
  componentDidMount() {
    const search = new URLSearchParams(this.props.location.search);
    const status = search.get("response_status");

    // set replay data
    this.props.initializeReplayEntity(
      this.props.datasource.id,
      this.props.initialValues,
    );

    if (status) {
      const display_message = search.get("display_message");
      // Set default error message
      let message = REST_API_AUTHORIZATION_FAILED;
      let variant = Variant.danger;
      if (status === "success") {
        message = REST_API_AUTHORIZATION_SUCCESSFUL;
        variant = Variant.success;
      } else if (status === "appsmith_error") {
        message = REST_API_AUTHORIZATION_APPSMITH_ERROR;
      }
      Toaster.show({
        text: display_message || createMessage(message),
        variant,
      });
    }
  }

  componentDidUpdate() {
    if (!this.props.formData) return;

    const { authType } = this.props.formData;

    if (authType === AuthType.OAuth2) {
      this.ensureOAuthDefaultsAreCorrect();
    } else if (authType === AuthType.apiKey) {
      this.ensureAPIKeyDefaultsAreCorrect();
    }
  }

  isDirty(prop: any) {
    const { formMeta } = this.props;
    return _.get(formMeta, prop + ".visited", false);
  }

  ensureAPIKeyDefaultsAreCorrect = () => {
    if (!this.props.formData) return;
    const { authentication } = this.props.formData;
    if (!authentication || !_.get(authentication, "addTo")) {
      this.props.change("authentication.addTo", ApiKeyAuthType.Header);
    }
    if (!authentication || !_.get(authentication, "headerPrefix")) {
      this.props.change("authentication.headerPefix", "ApiKeyAuthType.Header");
    }
  };

  ensureOAuthDefaultsAreCorrect = () => {
    if (!this.props.formData) return;
    const { authentication } = this.props.formData;

    if (!authentication || !_.get(authentication, "grantType")) {
      this.props.change(
        "authentication.grantType",
        GrantType.ClientCredentials,
      );
    }
    if (_.get(authentication, "isTokenHeader") === undefined) {
      this.props.change("authentication.isTokenHeader", true);
    }
    if (
      !this.isDirty("authentication.headerPrefix") &&
      _.get(authentication, "headerPrefix") === undefined
    ) {
      this.props.change("authentication.headerPrefix", "Bearer");
    }

    if (_.get(authentication, "grantType") === GrantType.AuthorizationCode) {
      if (_.get(authentication, "isAuthorizationHeader") === undefined) {
        this.props.change("authentication.isAuthorizationHeader", true);
      }
    }
  };

  disableSave = (): boolean => {
    const { formData } = this.props;
    if (!formData) return true;
    return !formData.url;
  };

  save = (onSuccess?: ReduxAction<unknown>) => {
    const normalizedValues = formValuesToDatasource(
      this.props.datasource,
      this.props.formData,
    );
    AnalyticsUtil.logEvent("SAVE_DATA_SOURCE_CLICK", {
      pageId: this.props.pageId,
      appId: this.props.applicationId,
    });
    this.props.updateDatasource(normalizedValues, onSuccess);
  };

  createApiAction = () => {
    const { actions, datasource, pageId } = this.props;
    if (
      !datasource ||
      !datasource.datasourceConfiguration ||
      !datasource.datasourceConfiguration.url
    ) {
      Toaster.show({
        text: "Unable to create API. Try adding a url to the datasource",
        variant: Variant.danger,
      });
      return;
    }
    const newApiName = createNewApiName(actions, pageId || "");

    const headers =
      this.props.datasource?.datasourceConfiguration?.headers ?? [];
    const queryParameters =
      this.props.datasource?.datasourceConfiguration?.queryParameters ?? [];
    const defaultApiActionConfig: ApiActionConfig = {
      ...DEFAULT_API_ACTION_CONFIG,
      headers: headers.length ? headers : DEFAULT_API_ACTION_CONFIG.headers,
      queryParameters: queryParameters.length
        ? queryParameters
        : DEFAULT_API_ACTION_CONFIG.queryParameters,
    };

    this.save(
      createActionRequest({
        name: newApiName,
        pageId: pageId,
        pluginId: datasource.pluginId,
        datasource: {
          id: datasource.id,
        },
        eventData: {
          actionType: "API",
          from: "datasource-pane",
        },
        actionConfiguration: defaultApiActionConfig,
      }),
    );
  };

  render = () => {
    return (
      <>
        <CloseEditor />
        <RestApiForm>
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            {this.renderHeader()}
            {this.renderEditor()}
            {this.renderSave()}
          </form>
        </RestApiForm>
      </>
    );
  };

  renderHeader = () => {
    const { isNewDatasource, pluginImage } = this.props;
    return (
      <Header>
        <FormTitleContainer>
          <PluginImage alt="Datasource" src={pluginImage} />
          <FormTitle focusOnMount={isNewDatasource} />
        </FormTitleContainer>
      </Header>
    );
  };

  renderSave = () => {
    const { datasourceId, deleteDatasource, isDeleting, isSaving } = this.props;
    return (
      <SaveButtonContainer>
        <ActionButton
          // accent="error"
          buttonStyle="DANGER"
          buttonVariant={ButtonVariantTypes.PRIMARY}
          className="t--delete-datasource"
          loading={isDeleting}
          onClick={() => deleteDatasource(datasourceId)}
          text="Delete"
        />

        <StyledButton
          className="t--save-datasource"
          disabled={this.disableSave()}
          filled
          intent="primary"
          loading={isSaving}
          onClick={() => this.save()}
          size="small"
          text="Save"
        />
      </SaveButtonContainer>
    );
  };

  renderEditor = () => {
    const { formData, messages } = this.props;
    if (!formData) return;
    return (
      <>
        {messages &&
          messages.map((msg, i) => (
            <Callout fill key={i} text={msg} variant={Variant.warning} />
          ))}
        <FormInputContainer data-replay-id={btoa("url")}>
          <InputTextControl
            {...COMMON_INPUT_PROPS}
            configProperty="url"
            isRequired
            label="URL"
            placeholderText="https://example.com"
          />
        </FormInputContainer>
        <FormInputContainer data-replay-id={btoa("headers")}>
          <KeyValueInputControl
            {...COMMON_INPUT_PROPS}
            configProperty="headers"
            label="Headers"
          />
        </FormInputContainer>

        <FormInputContainer>
          <KeyValueInputControl
            {...COMMON_INPUT_PROPS}
            configProperty="queryParameters"
            label="Query Parameters"
          />
        </FormInputContainer>
        <FormInputContainer data-replay-id={btoa("isSendSessionEnabled")}>
          <DropDownControl
            {...COMMON_INPUT_PROPS}
            configProperty="isSendSessionEnabled"
            isRequired
            label="Send Appsmith signature header"
            options={[
              {
                label: "Yes",
                value: true,
              },
              {
                label: "No",
                value: false,
              },
            ]}
            placeholderText=""
            propertyValue=""
            subtitle="Header key: X-APPSMITH-SIGNATURE"
          />
        </FormInputContainer>
        {formData.isSendSessionEnabled && (
          <FormInputContainer data-replay-id={btoa("sessionSignatureKey")}>
            <InputTextControl
              {...COMMON_INPUT_PROPS}
              configProperty="sessionSignatureKey"
              label="Session Details Signature Key"
              placeholderText=""
            />
          </FormInputContainer>
        )}
        <FormInputContainer data-replay-id={btoa("authType")}>
          <DropDownControl
            {...COMMON_INPUT_PROPS}
            configProperty="authType"
            label="Authentication Type"
            options={[
              {
                label: "None",
                value: AuthType.NONE,
              },
              {
                label: "Basic",
                value: AuthType.basic,
              },
              {
                label: "OAuth 2.0",
                value: AuthType.OAuth2,
              },
              {
                label: "API Key",
                value: AuthType.apiKey,
              },
              {
                label: "Bearer Token",
                value: AuthType.bearerToken,
              },
            ]}
            placeholderText=""
            propertyValue=""
          />
        </FormInputContainer>
        {this.renderAuthFields()}
      </>
    );
  };

  renderAuthFields = () => {
    const { authType } = this.props.formData;

    let content;
    if (authType === AuthType.OAuth2) {
      content = this.renderOauth2();
    } else if (authType === AuthType.basic) {
      content = this.renderBasic();
    } else if (authType === AuthType.apiKey) {
      content = this.renderApiKey();
    } else if (authType === AuthType.bearerToken) {
      content = this.renderBearerToken();
    }
    if (content) {
      return (
        <Collapsible defaultIsOpen title="Authentication">
          {content}
        </Collapsible>
      );
    }
  };

  renderApiKey = () => {
    const { authentication } = this.props.formData;
    return (
      <>
        <FormInputContainer data-replay-id={btoa("authentication.label")}>
          <InputTextControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.label"
            label="Key"
            placeholderText="api_key"
          />
        </FormInputContainer>
        <FormInputContainer data-replay-id={btoa("authentication.value")}>
          <InputTextControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.value"
            encrypted
            label="Value"
            placeholderText="value"
          />
        </FormInputContainer>
        <FormInputContainer data-replay-id={btoa("authentication.addTo")}>
          <DropDownControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.addTo"
            label="Add To"
            options={[
              {
                label: "Query Params",
                value: ApiKeyAuthType.QueryParams,
              },
              {
                label: "Header",
                value: ApiKeyAuthType.Header,
              },
            ]}
            placeholderText=""
            propertyValue=""
          />
        </FormInputContainer>
        {_.get(authentication, "addTo") == "header" && (
          <FormInputContainer
            data-replay-id={btoa("authentication.headerPrefix")}
          >
            <InputTextControl
              {...COMMON_INPUT_PROPS}
              configProperty="authentication.headerPrefix"
              label="Header Prefix"
              placeholderText="eg: Bearer "
            />
          </FormInputContainer>
        )}
      </>
    );
  };

  renderBearerToken = () => {
    return (
      <FormInputContainer data-replay-id={btoa("authentication.bearerToken")}>
        <InputTextControl
          {...COMMON_INPUT_PROPS}
          configProperty="authentication.bearerToken"
          encrypted
          label="Bearer Token"
          placeholderText="Bearer Token"
        />
      </FormInputContainer>
    );
  };

  renderBasic = () => {
    return (
      <>
        <FormInputContainer data-replay-id={btoa("authentication.username")}>
          <InputTextControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.username"
            label="Username"
            placeholderText="Username"
          />
        </FormInputContainer>
        <FormInputContainer data-replay-id={btoa("authentication.password")}>
          <InputTextControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.password"
            dataType="PASSWORD"
            encrypted
            label="Password"
            placeholderText="Password"
          />
        </FormInputContainer>
      </>
    );
  };

  renderOauth2 = () => {
    const { authentication } = this.props.formData;
    if (!authentication) return;
    let content;
    switch (_.get(authentication, "grantType")) {
      case GrantType.AuthorizationCode:
        content = this.renderOauth2AuthorizationCode();
        break;
      case GrantType.ClientCredentials:
        content = this.renderOauth2ClientCredentials();
        break;
    }

    return (
      <>
        <FormInputContainer data-replay-id={btoa("authentication.grantType")}>
          <DropDownControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.grantType"
            label="Grant Type"
            options={[
              {
                label: "Client Credentials",
                value: GrantType.ClientCredentials,
              },
              {
                label: "Authorization Code",
                value: GrantType.AuthorizationCode,
              },
            ]}
            placeholderText=""
            propertyValue=""
          />
        </FormInputContainer>
        {content}
      </>
    );
  };

  renderOauth2Common = () => {
    const { formData } = this.props;
    return (
      <>
        <FormInputContainer
          data-replay-id={btoa("authentication.isTokenHeader")}
        >
          <DropDownControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.isTokenHeader"
            label="Add Access Token To"
            options={[
              {
                label: "Request Header",
                value: true,
              },
              {
                label: "Request URL",
                value: false,
              },
            ]}
          />
        </FormInputContainer>
        {_.get(formData.authentication, "isTokenHeader") && (
          <FormInputContainer
            data-replay-id={btoa("authentication.headerPrefix")}
          >
            <InputTextControl
              {...COMMON_INPUT_PROPS}
              configProperty="authentication.headerPrefix"
              label="Header Prefix"
              placeholderText="eg: Bearer "
            />
          </FormInputContainer>
        )}
        <FormInputContainer
          data-replay-id={btoa("authentication.accessTokenUrl")}
        >
          <InputTextControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.accessTokenUrl"
            label="Access Token URL"
            placeholderText="https://example.com/login/oauth/access_token"
          />
        </FormInputContainer>
        <FormInputContainer data-replay-id={btoa("authentication.clientId")}>
          <InputTextControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.clientId"
            label="Client ID"
            placeholderText="Client ID"
          />
        </FormInputContainer>
        <FormInputContainer
          data-replay-id={btoa("authentication.clientSecret")}
        >
          <InputTextControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.clientSecret"
            dataType="PASSWORD"
            encrypted
            label="Client Secret"
            placeholderText="Client Secret"
          />
        </FormInputContainer>
        <FormInputContainer data-replay-id={btoa("authentication.scopeString")}>
          <InputTextControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.scopeString"
            label="Scope(s)"
            placeholderText="e.g. read, write"
          />
        </FormInputContainer>
      </>
    );
  };

  renderOauth2CommonAdvanced = () => {
    return (
      <>
        <FormInputContainer>
          <KeyValueInputControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.customTokenParameters"
            label="Custom Token Parameters"
          />
        </FormInputContainer>
        <FormInputContainer>
          <InputTextControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.audience"
            label="Audience"
            placeholderText="https://example.com/oauth/audience"
          />
        </FormInputContainer>
        <FormInputContainer data-replay-id={btoa("authentication.resource")}>
          <InputTextControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.resource"
            label="Resource"
            placeholderText="https://example.com/oauth/resource"
          />
        </FormInputContainer>
      </>
    );
  };

  renderOauth2ClientCredentials = () => {
    return (
      <>
        {this.renderOauth2Common()}
        {this.renderOauth2CommonAdvanced()}
      </>
    );
  };

  renderOauth2AuthorizationCode = () => {
    const { datasource, datasourceId, formData, isSaving, pageId } = this.props;
    const isAuthorized = _.get(
      datasource,
      "datasourceConfiguration.authentication.isAuthorized",
      false,
    );
    const redirectURL =
      window.location.origin + "/api/v1/datasources/authorize";
    return (
      <>
        {this.renderOauth2Common()}
        <FormInputContainer
          data-replay-id={btoa("authentication.authorizationUrl")}
        >
          <InputTextControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.authorizationUrl"
            label="Authorization URL"
            placeholderText="https://example.com/login/oauth/authorize"
          />
        </FormInputContainer>
        <FormInputContainer>
          <div style={{ width: "50vh" }}>
            <FormLabel>
              Redirect URL
              <br />
              <StyledInfo>
                Url that the oauth server should redirect to
              </StyledInfo>
            </FormLabel>
            <CopyToClipBoard copyText={redirectURL} />
          </div>
        </FormInputContainer>
        <FormInputContainer
          data-replay-id={btoa("authentication.customAuthenticationParameters")}
        >
          <KeyValueInputControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.customAuthenticationParameters"
            label="Custom Authentication Parameters"
          />
        </FormInputContainer>
        <FormInputContainer
          data-replay-id={btoa("authentication.isAuthorizationHeader")}
        >
          <DropDownControl
            {...COMMON_INPUT_PROPS}
            configProperty="authentication.isAuthorizationHeader"
            label="Client Authentication"
            options={[
              {
                label: "Send as Basic Auth header",
                value: true,
              },
              {
                label: "Send client credentials in body",
                value: false,
              },
            ]}
          />
        </FormInputContainer>
        {!_.get(formData.authentication, "isAuthorizationHeader", true) &&
          this.renderOauth2CommonAdvanced()}
        <FormInputContainer>
          <AuthorizeButton
            disabled={this.disableSave()}
            filled
            intent="primary"
            loading={isSaving}
            onClick={() =>
              this.save(
                redirectAuthorizationCode(pageId, datasourceId, PluginType.API),
              )
            }
            size="small"
            text={isAuthorized ? "Save and Re-Authorize" : "Save and Authorize"}
          />
        </FormInputContainer>
      </>
    );
  };
}

const mapStateToProps = (state: AppState, props: any) => {
  const datasource = state.entities.datasources.list.find(
    (e) => e.id === props.datasourceId,
  ) as Datasource;

  const hintMessages = datasource && datasource.messages;

  return {
    initialValues: datasourceToFormValues(datasource),
    datasource: datasource,
    actions: state.entities.actions,
    formData: getFormValues(DATASOURCE_REST_API_FORM)(
      state,
    ) as ApiDatasourceForm,
    formMeta: getFormMeta(DATASOURCE_REST_API_FORM)(state),
    messages: hintMessages,
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    initializeReplayEntity: (id: string, data: any) =>
      dispatch(updateReplayEntity(id, data, ENTITY_TYPE.DATASOURCE)),
    updateDatasource: (formData: any, onSuccess?: ReduxAction<unknown>) =>
      dispatch(updateDatasource(formData, onSuccess)),
    deleteDatasource: (id: string) => dispatch(deleteDatasource({ id })),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(
  reduxForm<ApiDatasourceForm, DatasourceRestApiEditorProps>({
    form: DATASOURCE_REST_API_FORM,
    enableReinitialize: true,
  })(DatasourceRestAPIEditor),
);
