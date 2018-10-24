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
            aws ecr get-login --no-include-email | bash
            docker build -t ${ECREGISTRY}/${PROJECT}:latest .
        '''
  }
  stage('Testing') {
        sh '''
          docker run -e "NODE_ENV=test" ${ECREGISTRY}/${PROJECT}:latest make testci
        '''
        setBuildStatus("Build complete", "SUCCESS");
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
  stage('Container deploy') {
        sh '''
          Branch="${GITHUB_PR_SOURCE_BRANCH}"
          REGION="us-east-1"

          #Depending on the Branch is where to Deploy
          case $Branch in
            master)
              ENV="prod"
              test -h ${JENKINS_HOME}/.aws && unlink ${JENKINS_HOME}/.aws
              ln -s ${JENKINS_HOME}/.aws-${ENV} ${JENKINS_HOME}/.aws
              cd ${PROJECT}
              git checkout $Branch
              cd .terraform/main
              ./terraform-run.sh ${REGION} ${ENV}
            ;;

            *)
              echo "Youre not pushing on Branch master."
              exit 0
            ;;
          esac
        '''
  }
}
