// on load
$(document).ready(function(){
    load();
    $(document).on('input', '#subreddit, #sort, #limit', function() {
        load();
    });

    $(document).on('input', '#imagesize', function() {
        resizeImage();
    });

    $(document).on('input', '#windowsize', function() {
        resizeWindows();
    });

    $(document).on('input', '#darkmode', function() {
        darkMode();
    });

    $('#showImage').click(function() {
        load();
    });
});

// global
var darkModeOn = false;
var windowState = $('#windowsize').val();
var commentStr = '';
var currentHeight = -1;

function load() {
    var json;
    var limit = $('#limit').val();
    var subreddit = $('#subreddit').val();
    var sort = $('#sort').val();

    if (subreddit.length > 0) {
        subreddit = 'r/' + subreddit;
    }

    $.getJSON('https://www.reddit.com/' + subreddit + '/' + sort + '/.json' + '?limit=' + limit, function(data){
        json = data;
    })
    .fail(function(jqxhr, event, exception) {
        if (jqxhr.status == 404) {
            $('#content').html(exception);
        }
    })
    .done(function() {
        var children = json.data.children;
        console.log(json);
        $('#content').html(JSON.stringify(children));
        // var titles = children.map(d => d.data.title);
        var finalString = "";
        var titleResults = "";
        var selfTextResults = "";
        for (var i=0; i<children.length; i++) {
            var data = children[i].data;

            var d = new Date(data.created*1000);
            var hours = (d.getHours() < 10) ? '0' + d.getHours(): d.getHours();
            var minutes = (d.getMinutes() < 10) ? '0' + d.getMinutes(): d.getMinutes();
            var date = d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDate() + ' | ' + hours + ':' + minutes;
            // ' <a target="_blank" href=\"' + data.url + '\">'
            var url = data.permalink;
            titleResults = '<div class="title" onclick="loadComment(\''+ url + '\')"><pre>' + data.score + '</pre> <h4>' + data.title + '</h4> <pre>' + data.num_comments + ' comments | ' + date + '</pre></div>';
            selfTextResults = '<p class="selftext">' + data.selftext + '</p>'
            selfTextResults = linkify(selfTextResults);
            finalString += titleResults + selfTextResults;
            if (typeof data.url_overridden_by_dest != 'undefined' && $('#showImage').prop("checked")) {
                // onerror="this.onerror=null; this.src=\'' + data.thumbnail + '\'"
                finalString += '<img alt="Failed to load" class="images" src=' + data.url_overridden_by_dest + '></img><br><br>';
            }
            finalString += '<hr>';
            $('#content').html(finalString);
            if (darkModeOn == true) {
                $('a').css('color', 'rgb(54, 154, 255)');
            }
            resizeImage();
            resizeWindows();
        }
    });
}// load

var currentHeight;
var maxHeight;

function loadComment(url){
    url = 'https://www.reddit.com' + url;
    var json;
    $.getJSON(url + '.json', function(data){
        json=data;
    })
    .fail(function(jqxhr, event, exception) {
        if (jqxhr.status == 404) {
            $('#content').html(exception);
        }
    })
    .done(function() {
        $('#comments').html('');
        commentStr = '';
        var post = json[0].data.children[0].data;
        var comments = json[1];

        var finalString = "";
        var titleResults = "";
        var selfTextResults = "";
        var d = new Date(post.created*1000);
        var hours = (d.getHours() < 10) ? '0' + d.getHours(): d.getHours();
        var minutes = (d.getMinutes() < 10) ? '0' + d.getMinutes(): d.getMinutes();
        var date = d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDate() + ' | ' + hours + ':' + minutes;
        // ' <a target="_blank" href=\"' + data.url + '\">'
        titleResults = '<h4><a target="_blank" href="' + url + '">' + post.title + '</a></h4> <pre>' + post.score + ' | ' + post.num_comments + ' comments | ' + date + '</pre>';
        selfTextResults = '<p class="selftext">' + post.selftext + '</p>'
        selfTextResults = linkify(selfTextResults);
        finalString += titleResults + selfTextResults;
        if (typeof post.url_overridden_by_dest != 'undefined') {
            // onerror="this.onerror=null; this.src=\'' + data.thumbnail + '\'"
            finalString += '<img alt="Failed to load" class=\'images\' src=' + post.url_overridden_by_dest + '></img><br><br>';
        }

        // console.log(comments);
        var commentsChildren = comments.data.children;
        // console.log('length: '+commentsChildren.length);
        currentHeight = -1;
        for (var i=0; i<commentsChildren.length; i++) {
            commentStr += '<hr>';
            currentHeight = -1;
            preorder(commentsChildren[i]);
        }// for

        $('#comments').prepend(finalString);
        $('#comments').append(commentStr);

        if (darkModeOn == true) {
            $('a').css('color', 'rgb(54, 154, 255)');
        }
        resizeImage();
    });
}



function preorder(root) {
    currentHeight++;
    if (typeof root == 'undefined'){
        return;
    }
    if (typeof root.data.body != 'undefined'){
        if (currentHeight != 0) {
            commentStr += '<p>' + '<span style="color: gray">' + currentHeight + '</span> ' + root.data.body + '</p>';
        } else {
            commentStr += '<p>' + root.data.body + '</p>';
        }
    }
    if (typeof root.data != 'undefined' && typeof root.data.replies != 'undefined' && typeof root.data.replies.data != 'undefined') {
        for (var i=0; i<root.data.replies.data.children.length; i++) {
            if (typeof root.data.replies.data != 'undefined')
                preorder(root.data.replies.data.children[i]);
                currentHeight--;
        }// for
    }// if
}// preorder

function darkMode() {
    if ($('body').css('background-color') != 'rgb(0, 0, 0)') {
        $('body, input, select, button').css('background-color', 'rgb(0, 0, 0)');
        $('body, input, select, button').css('color', 'rgb(182, 172, 159)');
        $('input, select, button').css('border-color', 'rgb(100, 100, 100)');
        $('.navbar').css('background-color', 'rgb(30, 30, 30)');
        $('.navbar').css('color', 'rgb(172, 162, 149)');
        $('a').css('color', 'rgb(54, 154, 255)');
        darkModeOn = true;
    } else {
        $('body, input, select, button').css('background-color', 'rgb(234, 234, 234)');
        $('body, input, select, button').css('color', 'rgb(0, 0, 0)');
        $('input, select, button').css('border-color', 'rgb(0, 0, 0)');
        $('.navbar').css('background-color', 'rgb(255, 255, 255)');
        $('.navbar').css('color', 'rgb(0, 0, 0)');
        $('a').css('color', 'rgb(0, 0, 238)');
        darkModeOn = false;
    }
}

function collapse(){
    if ($('#windowsize').val() != 100) {
        $('#windowBtn').html('Open window');
        $('#windowsize').val(100);
        resizeWindows();
    } else {
        $('#windowBtn').html('Collapse window');
        $('#windowsize').val(windowState);
        resizeWindows();
    }
}

function resizeImage() {
    var imageSize = ($('#imagesize').val()) * 10;
    $('img').css('height', imageSize);
}

function resizeWindows() {
    var windowSize = $('#windowsize').val();
    if (windowSize < 100) {
        windowState = windowSize;
        $('#windowBtn').html('Collapse window');
    } else {
        $('#windowBtn').html('Open window');
    }
    $('.left').css('width', windowSize+'%');
    $('.right').css('width', (100-windowSize)+'%');
}

function linkify(inputText) {
    var replacedText, replacePattern1, replacePattern2, replacePattern3;

    //URLs starting with http://, https://, or ftp://
    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
    replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

    //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

    //Change email addresses to mailto:: links.
    replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
    replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

    return replacedText;
}
