/* Reddit Reader
 * @author: Antony Xiao
 * 
 * last change: Jan 19, 2023
 * - fixed comment highlighting after toggling dark mode
 *
 *
 * change: Sept 9, 2022
 * - Use selftext.html if it exists
 * - improved separation <hr> lines
 * 
 *
 * Future plans:
 * - use body.html for comments with surrounding tags removed
 * - fix thread header wrapping, no space during wrap
 * - add loading pop up on the right screen
 * - allow inputting of reddit link to view specified thread
 *
 */


// run on load
$(document).ready(function(){
    load(); // main threads
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
});// ready

// global
var darkModeOn = false;
var windowState = $('#windowsize').val();
var commentStr = '';

// preorder current node depth / comment depth
var currentHeight = -1;

function load() {
    var json;
    var limit = $('#limit').val();
    var subreddit = $('#subreddit').val();
    var sort = $('#sort').val();

    if (subreddit.length > 0) {
        subreddit = 'r/' + subreddit;
    }// if

    // REST api call
    $.getJSON('https://www.reddit.com/' + subreddit + '/' + sort + '/.json' + '?limit=' + limit, function(data){
        json = data;
    })
    .fail(function(jqxhr, event, exception) {
        if (jqxhr.status == 404) {
            $('#content').html(exception);
        }// if
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
            
            titleResults = '<div class="title" onclick="loadComment(\''+ url + '\')"><h4>' + data.title + '</h4><br><pre class="thread_info">' + data.score + ' | ' + data.num_comments + ' comments | ' + date + '</pre></div>';

            selfTextResults = getSelfText(data.selftext, data.selftext_html);

            // surround links in attribute tags
            // selfTextResults = linkify(selfTextResults);
            finalString += titleResults + selfTextResults;

            if (typeof data.url_overridden_by_dest != 'undefined' && $('#showImage').prop("checked")) {
                // onerror="this.onerror=null; this.src=\'' + data.thumbnail + '\'"
                finalString += '<img alt="Failed to load" class="images" src=' + data.url_overridden_by_dest + '></img>';
            }// if

            finalString += '<hr id="separator">';

            $('#content').html(finalString);

            if (darkModeOn == true) {
                $('a').css('color', 'rgb(54, 154, 255)');
            }// if

            resizeImage();
            resizeWindows();
        }// for

        // fixes not scrolling to the end
        $('#content').append('<br><br>');
    });
}// load

var currentHeight;
var maxHeight;

function loadComment(url){
    // api url
    url = 'https://www.reddit.com' + url;

    var json; // stores the json files retrieved from api url

    // REST api
    $.getJSON(url + '.json', function(data){
        json = data;
    })// getJSON
    .fail(function(jqxhr, event, exception) {
        if (jqxhr.status == 404) {
            $('#content').html(exception);
        }// if
    })// failed fetch
    .done(function() { // fetch success

        console.log(json);
        $('#comments').html('');
        commentStr = '';
        var post = json[0].data.children[0].data;
        var comments = json[1];

        var finalString = "";
        var titleResults = "";
        var selfTextResults = "";

        /* date */
        var d = new Date(post.created*1000);
        var hours = (d.getHours() < 10) ? '0' + d.getHours(): d.getHours();
        var minutes = (d.getMinutes() < 10) ? '0' + d.getMinutes(): d.getMinutes();
        var date = d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDate() + ' | ' + hours + ':' + minutes;

        // ' <a target="_blank" href=\"' + data.url + '\">'
        
        titleResults = '<h4><a target="_blank" href="' + url + '">' + post.title + '</a></h4> <pre>' + post.score + ' | ' + post.num_comments + ' comments | ' + date + '</pre>';

        /* issue */
        /* WTF? redundant code */
        /* tag is added when innerHTML is empty */
        /* 
        if (post.selftext) {
            console.log('selftext');
            selfTextResults = '<p class="selftext">' + post.selftext + '</p>'
        } else {
            console.log('no selftext');
        }
        */
        /* obsolete */
        // selfTextResults = linkify(selfTextResults);

        selfTextResults = '<br>' + post.selftext;
        finalString += titleResults + selfTextResults;
        if (typeof post.url_overridden_by_dest != 'undefined') {
            // onerror="this.onerror=null; this.src=\'' + data.thumbnail + '\'"
            finalString += '<img alt="Failed to load" class=\'images\' src=' + post.url_overridden_by_dest + '></img>';
        }// if

        // console.log(comments);
        var commentsChildren = comments.data.children;
        // console.log('length: '+commentsChildren.length);
        currentHeight = -1;
        for (var i=0; i<commentsChildren.length; i++) {
            commentStr += '<hr id="separator">';
            currentHeight = -1; // so first child would be 1
            preorder(commentsChildren[i]);
        }// for

        $('#comments').prepend(finalString);
        $('#comments').append(commentStr);

        if (darkModeOn == true) {
            $('a').css('color', 'rgb(54, 154, 255)');
        }
        resizeImage();
    });
}// loadComment

/*
 * preorder traversal through a n-ary tree with current node depth for loading child comments
 * the comment tree is a n-ary tree where n >= 0
 * 
 */
function preorder(root) {
    currentHeight++;
    
    // base case, no more child comments
    if (typeof root == 'undefined'){
        return;
    }// if

    // when the comment exists
    if (typeof root.data.body != 'undefined'){

        // get raw text or html
        var comment = getCommentText(root.data.body, root.data.body_html);

        if (currentHeight != 0) {
            //commentStr += '<span style="margin-left:' + currentHeight*5 + 'px;">' + comment + '</span>';
            var temp = '<div class="md" style="margin-left:' + (currentHeight - 1) * 5 + 'px;">';
            commentStr += comment.replace('<div class="md">', temp);
        } else {
            comment = comment.replace('<div class="md">', '<div class="parent">');
            commentStr += comment;
        }// else
    }

    // iterates through all the child
    if (typeof root.data != 'undefined' && typeof root.data.replies != 'undefined' && typeof root.data.replies.data != 'undefined') {
        for (var i=0; i<root.data.replies.data.children.length; i++) {
            if (typeof root.data.replies.data != 'undefined')
                preorder(root.data.replies.data.children[i]); // recursive call
                currentHeight--; // reaches a parent node
        }// for
    }// if
}// preorder


function getSelfText(selftext, selftext_html) {
    var selfTextResults = '';
    if (selftext_html == null) {
        // selfTextResults = '<p class="selftext">' + selftext + '</p>'
        selfTextResults = selftext;
    } else {
        var txt = document.createElement("textarea");
        txt.innerHTML = selftext_html
        
        var final_selftext = txt.value.replace('<!-- SC_OFF --><div class="md">','');
        final_selftext = final_selftext.replace('</div><!-- SC_ON -->','');

        // some how causes <p></p> to appear at the end
        // selfTextResults = '<p class="selftext">' + final_selftext + '</p>'
        selfTextResults = '<div>' + final_selftext + '</div>';

    }// else
    return selfTextResults;
}// getSelfText

function getCommentText(comment_text, comment_text_html) {
    var selfTextResults = '';
    if (comment_text_html == null) {
        selfTextResults = comment_text;
        //selfTextResults = '<p class="selftext">' + comment_text + '</p>'
    } else {
        var txt = document.createElement("textarea");
        txt.innerHTML = comment_text_html;

        selfTextResults = txt.value;
        //selfTextResults = '<p class="selftext">' + final_selftext + '</p>'

    }// else
    return selfTextResults;
}// getSelfText


/*
 * toggles dark mode
 *
 * changes the css for targeting elements
 *
 */
function darkMode() {
    if ($('body').css('background-color') != 'rgb(0, 0, 0)') {
        $('body, input, select, button').css('background-color', 'rgb(0, 0, 0)');
        $('body, input, select, button').css('color', 'rgb(182, 172, 159)');
        $('input, select, button').css('border-color', 'rgb(100, 100, 100)');
        $('.navbar').css('background-color', 'rgb(30, 30, 30)');
        $('.navbar').css('color', 'rgb(172, 162, 149)');
        $('a').css('color', 'rgb(54, 154, 255)');
        $('.md').css('border-left-color', '#707070');
		$('.md').hover(
			function() {
				$(this).css('background-color','#222222');
			}, function() {
				$(this).css('background-color','');
			}
		);
		/*$(".myclass").mouseover(function() {
    $(this).find(" > div").css("background-color","red");
}).mouseout(function() {
    $(this).find(" > div").css("background-color","transparent");
});*/
        darkModeOn = true;
    } else {
        $('body, input, select, button').css('background-color', '');
        $('body, input, select, button').css('color', '');
        $('input, select, button').css('border-color', '');
        $('.navbar').css('background-color', '');
        $('.navbar').css('color', '');
        $('a').css('color', '');
        $('.md').css('border-left-color', 'black');
        $('.md').hover(
			function() {
				$(this).css('background-color','#d9d9d9');
			}, function(){
				$(this).css('background-color','');
			}
		);
		/*$(".myclass").mouseover(function() {
    $(this).find(" > div").css("background-color","red");
}).mouseout(function() {
    $(this).find(" > div").css("background-color","transparent");
});*/
        darkModeOn = false;
    }
}// darkMode


/*
 * collapses the right window
 *
 */ 
function collapse(){
    if ($('#windowsize').val() != 100) {
        $('#windowBtn').html('Open window');
        $('#windowsize').val(100);
        resizeWindows();
    } else {
        $('#windowBtn').html('Collapse window');
        $('#windowsize').val(windowState);
        resizeWindows();
    }// else
}// collapse


/*
 * resizes the images
 *
 */
function resizeImage() {
    var imageSize = ($('#imagesize').val()) * 10;
    $('img').css('height', imageSize);
}// resizeImage


/*
 * changes the size of the windows
 *
 */
function resizeWindows() {
    var windowSize = $('#windowsize').val();

    if (windowSize < 100) {
        windowState = windowSize;
        $('#windowBtn').html('Collapse window');
    } else {
        $('#windowBtn').html('Open window');
    }// else

    $('.left').css('width', windowSize+'%');
    $('.right').css('width', (100-windowSize)+'%');
}// resizeWindows


/* 
 * Adds and return Attribute tag <a> to links in strings
 * 
 */
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
}// linkify
