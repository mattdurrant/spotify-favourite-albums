const fs        = require('fs');
const config    = require('./config.json')

async function writeToHtml(albums) {
    let filename = config.filename
    let stream = fs.createWriteStream(filename)

    await stream.once('open', function(fd) {
        let html = buildHtml(albums)
        stream.end(html)
    })

    return filename
}

function buildHtml(albums) {
    let header = `<link rel="stylesheet" type="text/css" href="http://www.mattdurrant.com/wp-content/themes/independent-publisher/style.css?ver=4.9.10">`
    header += `<link rel='stylesheet' id='genericons-css'  href='http://www.mattdurrant.com/wp-content/themes/independent-publisher/fonts/genericons/genericons.css?ver=3.1' type='text/css' media='all' />`
    header += `<link rel='stylesheet' id='customizer-css'  href='http://www.mattdurrant.com/wp-admin/admin-ajax.php?action=independent_publisher_customizer_css&#038;ver=1.7' type='text/css' media='all' />`
    header += `<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/moment.min.js"></script>`
    header += `<script src="https://code.jquery.com/jquery-3.4.1.min.js" integrity="sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=" crossorigin="anonymous"></script>`
    header += `<link rel='stylesheet' href='https://cdn.datatables.net/1.10.19/css/jquery.dataTables.min.css' type='text/css' media='all' />`
    header += `<script src="https://cdn.datatables.net/1.10.19/js/jquery.dataTables.min.js"></script>`
    header += `<script>$(document).ready( function () { $('#results').DataTable({ paging: false, "columns": [{ "orderable": false }, null, null ] }); } );</script>`

    let body = `<div id="page" class="site"><div class="entry-content e-content"><header class="entry-header"><h1 class="entry-title p-name">100 Favourite Albums</h1></header>`
    body += `<table id="results" border="1"><thead></th><th></th><th>Album</th><th>Position</th></tr></thead><tbody>`
    
    for (let i = 0; i < albums.length; i++) {
        body += `<tr>`
        body += `<td class="normal" style="vertical-align:top"><a href="${albums[i].albumUrl}"><img src="${albums[i].albumArtUrl}"></img></a></td>`
        body += `<td class="normal" style="vertical-align:top"><a href="${albums[i].albumUrl}">${albums[i].albumName}</a><br>${albums[i].artistName}</td>`
        body += `<td class="normal" style="vertical-align:top"><b>${i + 1}</b></td>`
        body += `</tr>`
    }
    body += `</tbody></table></div></div>`

    return '<!DOCTYPE html>'
         + '<html><head>' + header + '</head><body class="home blog no-post-excerpts hfeed h-feed" itemscope="itemscope" itemtype="http://schema.org/WebPage">' + body + '</body></html>';
}

module.exports = {
    writeToHtml
}
