node {
  stage('Git clone/update') {
        sshagent(credentials : ['communications-server']) {
        sh '''
            #Check the content of the payload and extract the Branch
            Branch="master"
            git clone ${REPOURL}/${PROJECT}.git && cd ${PROJECT} || cd ${PROJECT}
            git checkout $Branch
            if test $? -ne 0; then
              echo "Unable to checkout $Branch."
            fi
            git fetch
            git pull'''
  }
  stage('Image building') {
        sh '''
            aws ecr get-login --no-include-email | bash
            cd ${PROJECT}
            docker build -t ${ECREGISTRY}/${PROJECT}:latest .
        '''
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
  stage('Testing') {
        sh '''
          echo "Here goes the test"
        '''
  }
  stage('Image push') {
        sh '''
          docker push ${ECREGISTRY}/${PROJECT}:latest
          docker rmi ${ECREGISTRY}/${PROJECT}:latest
        '''
        }
  }
  stage('Container deploy') {
        sh '''
          Branch="master"
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
              exit 2
            ;;
          esac
        '''
  }
  stage('Post Message') {
        sh '''
          /usr/bin/curl -X POST --data-urlencode "payload={"text\\": \\"The branch $Branch wasa deployed Ok\\"}" https://hooks.slack.com/services/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
        '''
  }
}
