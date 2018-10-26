void setBuildStatus(String message, String state) {
  step([
      $class: "GitHubCommitStatusSetter",
      reposSource: [$class: "ManuallyEnteredRepositorySource", url: "${PROJECT_URL}"],
      contextSource: [$class: "ManuallyEnteredCommitContextSource", context: "ci/jenkins/build-status"],
      errorHandlers: [[$class: "ChangingBuildStatusErrorHandler", result: "UNSTABLE"]],
      statusResultSource: [ $class: "ConditionalStatusResultSource", results: [[$class: "AnyBuildResult", message: message, state: state]] ]
  ]);
}


node {
  try {
    slackSend baseUrl: 'https://hooks.slack.com/services/', channel: '#pipeline-outputs', color: 'good', message: "Project - *${env.PROJECT}* \n\tBranch: *${Branch}* \n\tStatus: *Started...*\n\tJob: *${env.JOB_NAME}*  \n\tBuild Number: *${env.BUILD_NUMBER}* \n\tURL: (<${env.BUILD_URL}|Open>)", teamDomain: 'decentralandteam', tokenCredentialId: 'slack-notification-pipeline-output'
    stage('Git clone/update') {
        git url: "${REPOURL}/${PROJECT}.git",
            branch: "${GITHUB_PR_SOURCE_BRANCH}",
            credentialsId: 'communications-server'
    }
    stage('Image building') {
        sh '''
            aws ecr get-login --no-include-email | bash
            docker build -t ${ECREGISTRY}/${PROJECT}:latest .
        '''
    }
    stage('Testing') {
        try {
            sh 'docker run -e "NODE_ENV=test" ${ECREGISTRY}/${PROJECT}:latest make testci'
            setBuildStatus("Build complete", "SUCCESS");
        } catch (exc) {
            setBuildStatus("Build complete", "FAILURE");
        }
    }
    stage('Removing  previous containers') {
        sh '''
          RUNNING_CONTAINERS=`docker ps | awk '{ print $1 }' | grep -v CONTAINER | wc -l`
          if test ${RUNNING_CONTAINERS} -ne 0; then
            docker ps | awk '{ print $1 }' | grep -v CONTAINER | xargs docker stop
          fi
          RUNNING_CONTAINERS=`docker ps -a | awk '{ print $1 }' | grep -v CONTAINER | wc -l`
          if test ${RUNNING_CONTAINERS} -ne 0; then
            docker ps -a | awk '{ print $1 }' | grep -v CONTAINER | xargs docker rm
          fi
        '''
    }
    stage('Image push') {
        sh '''
          docker push ${ECREGISTRY}/${PROJECT}:latest
          docker rmi ${ECREGISTRY}/${PROJECT}:latest
        '''
    }
    slackSend baseUrl: 'https://hooks.slack.com/services/', channel: '#pipeline-outputs', color: 'good', message: "Project - *${env.PROJECT}* \n\tBranch: *${Branch}* \n\tStatus: *Finished OK*\n\tJob: *${env.JOB_NAME}*  \n\t Build Number: *${env.BUILD_NUMBER}* \n\tURL: (<${env.BUILD_URL}|Open>)", teamDomain: 'decentralandteam', tokenCredentialId: 'slack-notification-pipeline-output'
  } catch (caughtError) { //End of Try
    err = caughtError
    slackSend baseUrl: 'https://hooks.slack.com/services/', channel: '#pipeline-outputs', color: '#FF0000', message: "Project - *${env.PROJECT}* \n\tError: ${err}\n\tJob: *${env.JOB_NAME}*  \n\t Build Number: *${env.BUILD_NUMBER}* \n\tURL: (<${env.BUILD_URL}|Open>)", teamDomain: 'decentralandteam', tokenCredentialId: 'slack-notification-pipeline-output'
    currentBuild.result = "FAILURE"
  }
}
