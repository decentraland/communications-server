node {
  stage('Git clone/update') {
        sshagent(credentials : ['communications-server']) {
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
          echo "Here goes the Image build"
        '''
  }
  stage('Testing') {
        sh '''
          echo "Here goes the test"
        '''
  }
  stage('Image push') {
        sh '''
          echo "Here goes the push"
        '''
        }
  }
  stage('Container deploy') {
        sh '''
          echo  "And here the deploy"
        '''
  }
  stage('Post Message') {
    sh '''
    /usr/bin/curl -X POST --data-urlencode "payload={"text\\": \\"The branch\\"}" https://hooks.slack.com/services/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
    '''
  }
}
