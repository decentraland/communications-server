node {
  stage('Git clone/update') {
        sshagent(credentials : ['nagios-prod']) {
        sh '''
            Branch=`echo $Branch | awk -F"/" '{print $NF}'`
            git clone ${REPOURL}/${PROJECT}.git && cd ${PROJECT} || cd ${PROJECT}
            git checkout $Branch
            if test $? -ne 0; then
              echo "Unable to checkout $Branch."
            fi
            git fetch
            git pull'''
        }
  }
  stage('Image building') {
        sh '''
          cd ${PROJECT}
          tar -zcvf ${PROJECT}.tar.gz etc root usr
          docker build -t ${ECREGISTRY}/${PROJECT}:latest .
          rm ${PROJECT}.tar.gz
        '''
  }
  stage('Testing') {
    sh '''CONTAINERID=`docker run -d --name ${PROJECT} --rm $ECREGISTRY/$PROJECT:latest`
        docker ps
        if test $? -ne 0; then
          echo "Error testing the container"
          exit 2;
        fi
        docker stop $CONTAINERID'''
  }
  stage('Image push') {
        docker.withRegistry("https://$ECREGISTRY", "ecr:us-east-1:prod") {
           docker.image("$ECREGISTRY/$PROJECT:latest").push()
           sh 'docker rmi $ECREGISTRY/$PROJECT:latest'
        }
  }
  stage('Container deploy') {
    sh '''
      Branch=`echo $Branch | awk -F"/" '{print $NF}'`
      case $Branch in
        master)
                cd ${PROJECT}
                git checkout master
                test -h ${JENKINS_HOME}/.aws && unlink ${JENKINS_HOME}/.aws
                ln -s ${JENKINS_HOME}/.aws-prod ${JENKINS_HOME}/.aws
                cd .terraform/main
                ./terraform-run.sh us-east-1 prod
        ;;

        *)  echo "Nagios dont work in env"
        ;;
      esac
    '''
  }
  stage('Post Message') {
    sh '''
    Branch=`echo $Branch | awk -F"/" '{print $NF}'`
    /usr/bin/curl -X POST --data-urlencode "payload={\\"channel\\": \\"$Channel\\", \\"username\\": \\"$Username\\", \\"text\\": \\"The branch $Branch from repo $Repo was updated by $Committer with commit number $CommitNumber\\"}" $Url
    '''
  }
}
