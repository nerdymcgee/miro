# Miro - an RSS based video player application
# Copyright (C) 2005-2007 Participatory Culture Foundation
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301 USA

import tabs
import feed
import item
import folder
import playlist
import guide
import search

# Returns items that match search
def matchingItems(obj, searchString):
    if searchString is None:
        return True
    searchString = searchString.lower()
    title = obj.getTitle() or ''
    desc = obj.getRawDescription() or ''
    if search.match (searchString, [title.lower(), desc.lower()]):
        return True
    if not obj.isContainerItem:
        parent = obj.getParent()
        if parent != obj:
            return matchingItems (parent, searchString)
    return False

def downloadingItems(obj):
    return obj.getState() == 'downloading'

def downloadingOrPausedItems(obj):
    return obj.getState() in ('downloading', 'paused')

def unwatchedItems(obj):
    return obj.getState() == 'newly-downloaded' and not obj.isNonVideoFile()

def expiringItems(obj):
    return obj.getState() == 'expiring' and not obj.isNonVideoFile()

def watchableItems(obj):
    return (obj.isDownloaded() and not obj.isNonVideoFile() and 
            not obj.isContainerItem)

def autoUploadingDownloaders(obj):
    return obj.getState() == 'uploading' and not obj.manualUpload

def notDeleted(obj):
    return not (isinstance (obj, item.FileItem) and obj.deleted)

newMemory = {}
newlyDownloadedMemory = {}
newMemoryFor = None

def switchNewItemsChannel(newChannel):
    """The newItems() filter normally remembers which items were unwatched.
    This way items don't leave the new section while the user is viewing a
    channel.  This method takes care of resetting the memory when the user
    switches channels.  Call it before using the newItems() filter.
    newChannel should be the channel/channel folder object that's being
    displayed.
    """
    global newMemoryFor, newMemory, newlyDownloadedMemory
    if newMemoryFor != newChannel:
        newMemory.clear()
        newlyDownloadedMemory.clear()
        newMemoryFor = newChannel


# This is "new" for the channel template
def newItems(obj):
    try:
        rv = newMemory[obj.getID()]
    except KeyError:
        rv = not obj.getViewed()
        newMemory[obj.getID()] = rv
    return rv

def newWatchableItems(obj):
    if not obj.isDownloaded() or obj.isNonVideoFile():
        return False
    try:
        rv = newlyDownloadedMemory[obj.getID()]
    except KeyError:
        rv = (obj.getState() == u"newly-downloaded")
        newlyDownloadedMemory[obj.getID()] = rv
    return rv

# Return True if a tab should be shown for obj in the frontend. The filter
# used on the database to get the list of tabs.
def mappableToTab(obj):
    return ((isinstance(obj, feed.Feed) and obj.isVisible()) or
            obj.__class__ in (tabs.StaticTab,
                folder.ChannelFolder, playlist.SavedPlaylist,
                folder.PlaylistFolder, guide.ChannelGuide))

def autoDownloads(item):
    return item.getAutoDownloaded() and downloadingOrPausedItems(item)

def manualDownloads(item):
    return not item.getAutoDownloaded() and not item.isPendingManualDownload() and item.getState() == 'downloading'

def uniqueItems(item):
    try:
        return item.downloader.itemList[0] == item
    except:
        return True
