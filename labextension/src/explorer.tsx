///<reference path="../node_modules/@types/node/index.d.ts"/>

import {
    JupyterFrontEnd,
    JupyterFrontEndPlugin,
    ILabShell,
    ILayoutRestorer
} from "@jupyterlab/application";

import {
    INotebookTracker
} from '@jupyterlab/notebook';

import {ReactWidget} from "@jupyterlab/apputils";

import {Token} from "@phosphor/coreutils";
import {Widget} from "@phosphor/widgets";
import * as React from "react";
import {request} from 'http';

import '../style/index.css';


class InputText extends React.Component<{ label: string, placeholder: string, updateValue: Function, value: string}, any> {
    render() {
        return (
            <div className="input-container">
                <div className="input-wrapper">
                    <input placeholder={this.props.placeholder}
                           value={this.props.value}
                           onChange={evt => this.props.updateValue((evt.target as HTMLInputElement).value)}
                    />
                </div>
            </div>
        )
    }
}

class DeployButton extends React.Component<{callback: Function}, any> {
    render() {
        return (
            <div className="deploy-button">
                <button onClick={() => { this.props.callback()} }>
                    <span>Deploy to Kubeflow Pipelines</span>
                </button>
            </div>
        )
    }
}


class KubeflowDeploymentUI extends React.Component<
    { tracker: INotebookTracker },
    { pipeline_name: string, pipeline_description: string }
> {
    state = {
        pipeline_name: '',
        pipeline_description: ''
    };

    updatePipelineName = (name: string) => this.setState({pipeline_name: name});
    updatePipelineDescription = (desc: string) => this.setState({pipeline_description: desc});

    activeNotebookToJSON = () => {
        console.log(this.state.pipeline_name);
        let nb = this.props.tracker.currentWidget;
        if (nb !== null) {
            return nb.content.model.toJSON();
        } else {
            console.log("No Notebook active")
        }
        return null
    };

    deployToKFP = () => {
        const notebook = this.activeNotebookToJSON();
        if (notebook === null) {
            console.log("Could not complete deployment operation");
            return
        }
        // prepare request
        const req = request(
            {
                host: 'localhost',
                port: '5000',
                path: '/kale',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            },
            response => {
                console.log(response); // 200
            }
        );

        req.write(JSON.stringify({
            deploy: 'True',
            pipeline_name: 'test_pipeline',
            pipeline_descr: 'Auto-generated pipeline from the Jupyter Notebook Kale extension',
            nb: notebook
        }));
        req.end();

    };

    render() {
        const pipeline_name_input = <InputText
            label={"Pipeline Name"}
            placeholder={"Pipeline Name"}
            updateValue={this.updatePipelineName}
            value={this.state.pipeline_name}
        />;

        const pipeline_desc_input = <InputText
            label={"Pipeline Description"}
            placeholder={"Pipeline Description"}
            updateValue={this.updatePipelineDescription}
            value={this.state.pipeline_description}
        />;
        // const myin = inputComponent("Pipeline Name", "Pipeline Name");
        console.log(this.state.pipeline_name);
        return (
            <div
                style={{
                    background: "var(--jp-layout-color1)",
                    color: "#000000",
                    fontFamily: "Helvetica",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column"
                }}
            >

                <div style={{overflow: "auto"}}>
                    <p className="p-CommandPalette-header">Kubeflow Pipelines Deployment</p>
                </div>


                {pipeline_name_input}

                {pipeline_desc_input}

                <DeployButton callback={this.deployToKFP} />

            </div>
        );
    }
}

/* tslint:disable */
export const IKubeflowKale = new Token<IKubeflowKale>(
    "kubeflow-kale:IKubeflowKale"
);

export interface IKubeflowKale {
    widget: Widget;
}

const id = "kubeflow-kale:deploymentPanel";
/**
 * Adds a visual Kubeflow Pipelines Deployment tool to the sidebar.
 */
export default {
    activate,
    id,
    requires: [ILabShell, ILayoutRestorer, INotebookTracker],
    provides: IKubeflowKale,
    autoStart: true
} as JupyterFrontEndPlugin<IKubeflowKale>;

function activate(
    lab: JupyterFrontEnd,
    labShell: ILabShell,
    restorer: ILayoutRestorer,
    tracker: INotebookTracker
): IKubeflowKale {
    // Create a dataset with this URL
    const widget = ReactWidget.create(
        <KubeflowDeploymentUI
            tracker={tracker}
        />
    );
    widget.id = "kubeflow-kale/kubeflowDeployment";
    widget.title.iconClass = "jp-kubeflow-logo jp-SideBar-tabIcon";  // old icon: jp-SpreadsheetIcon
    widget.title.caption = "Kubeflow Pipelines Deployment Panel";

    restorer.add(widget, widget.id);
    labShell.add(widget, "left");
    return {widget};
}