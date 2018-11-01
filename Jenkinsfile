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
    stage('Git clone/update') {
        git url: "${REPOURL}/${PROJECT}.git",
            branch: "${GITHUB_PR_SOURCE_BRANCH}",
            credentialsId: 'communications-server'
    }
    stage('Image building') {
        sh '''
            git checkout ${GITHUB_PR_SOURCE_BRANCH}
            #Find last commit number to use as a tag
            cd {PROJECT}
            LASTCOMMIT=`git rev-parse HEAD`
            aws ecr get-login --no-include-email | bash
            docker build -t ${ECREGISTRY}/${PROJECT}:${LASTCOMMIT} .
        '''
    }
    stage('Testing') {
        try {
            sh 'docker run --name ${PROJECT} -e "NODE_ENV=test" --rm ${ECREGISTRY}/${PROJECT}:${LASTCOMMIT} make testci'
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
          LASTCOMMIT=`git rev-parse HEAD`
          aws ecr get-login --no-include-email | bash
          docker push ${ECREGISTRY}/${PROJECT}:${LASTCOMMIT}
          docker rmi ${ECREGISTRY}/${PROJECT}:${LASTCOMMIT}
        '''
    }
}
